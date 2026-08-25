from fastapi import HTTPException, status
from sqlalchemy import Connection

from app.modules.double_benefit import repository
from app.modules.double_benefit.schemas import DoubleBenefitPayoutOut, SaleProofCreate, SaleProofOut
from app.modules.listings import repository as listings_repository
from app.modules.payments import repository as payments_repository


def submit_sale_proof(conn: Connection, seller_id: int, payload: SaleProofCreate) -> SaleProofOut:
    listing = listings_repository.get_listing_by_id(conn, payload.listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="매물을 찾을 수 없습니다.")
    if listing["seller_id"] != seller_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="본인 매물만 증빙할 수 있습니다.")

    purchase = payments_repository.get_purchase_by_id(conn, payload.listing_purchase_id)
    if purchase is None or purchase["listing_id"] != payload.listing_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="해당 매물의 결제 내역이 아닙니다.")

    proof = repository.create_sale_proof(conn, uploaded_by=seller_id, **payload.model_dump())
    listings_repository.update_status(conn, payload.listing_id, "reserved")
    return SaleProofOut(**proof)


def list_pending_sale_proofs(conn: Connection) -> list[SaleProofOut]:
    return [SaleProofOut(**p) for p in repository.list_pending_sale_proofs(conn)]


def verify_sale_proof(conn: Connection, sale_proof_id: int) -> DoubleBenefitPayoutOut:
    proof = repository.get_sale_proof(conn, sale_proof_id)
    if proof is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="증빙 내역을 찾을 수 없습니다.")
    if proof["status"] != "submitted":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 처리된 증빙입니다.")

    listing = listings_repository.get_listing_by_id(conn, proof["listing_id"])
    purchase = payments_repository.get_purchase_by_id(conn, proof["listing_purchase_id"])

    repository.update_sale_proof_status(conn, sale_proof_id, "verified")
    listings_repository.update_status(conn, proof["listing_id"], "sold")

    payout = repository.create_payout(
        conn,
        listing_id=proof["listing_id"],
        sale_proof_id=sale_proof_id,
        agent_company_id=purchase["agent_company_id"],
        seller_id=listing["seller_id"],
        amount=purchase["amount"],
    )
    return DoubleBenefitPayoutOut(**payout)


def reject_sale_proof(conn: Connection, sale_proof_id: int) -> SaleProofOut:
    proof = repository.get_sale_proof(conn, sale_proof_id)
    if proof is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="증빙 내역을 찾을 수 없습니다.")
    if proof["status"] != "submitted":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 처리된 증빙입니다.")

    repository.update_sale_proof_status(conn, sale_proof_id, "rejected")
    listings_repository.update_status(conn, proof["listing_id"], "active")
    return SaleProofOut(**repository.get_sale_proof(conn, sale_proof_id))


def list_my_payouts(conn: Connection, seller_id: int) -> list[DoubleBenefitPayoutOut]:
    return [DoubleBenefitPayoutOut(**p) for p in repository.list_payouts_by_seller(conn, seller_id)]


def mark_payout_paid(conn: Connection, payout_id: int) -> None:
    repository.mark_payout_paid(conn, payout_id)
