from fastapi import APIRouter, Depends
from sqlalchemy import Connection

from app.database import get_db
from app.deps import require_role
from app.modules.double_benefit import service
from app.modules.double_benefit.schemas import DoubleBenefitPayoutOut, SaleProofCreate, SaleProofOut

router = APIRouter(prefix="/double-benefit", tags=["double-benefit"])


@router.post("/sale-proofs", response_model=SaleProofOut)
def submit_sale_proof(
    payload: SaleProofCreate,
    user: dict = Depends(require_role("customer")),
    conn: Connection = Depends(get_db),
) -> SaleProofOut:
    return service.submit_sale_proof(conn, user["id"], payload)


@router.get("/sale-proofs/pending", response_model=list[SaleProofOut])
def list_pending_sale_proofs(
    _: dict = Depends(require_role("admin")),
    conn: Connection = Depends(get_db),
) -> list[SaleProofOut]:
    return service.list_pending_sale_proofs(conn)


@router.post("/sale-proofs/{sale_proof_id}/verify", response_model=DoubleBenefitPayoutOut)
def verify_sale_proof(
    sale_proof_id: int,
    _: dict = Depends(require_role("admin")),
    conn: Connection = Depends(get_db),
) -> DoubleBenefitPayoutOut:
    return service.verify_sale_proof(conn, sale_proof_id)


@router.post("/sale-proofs/{sale_proof_id}/reject", response_model=SaleProofOut)
def reject_sale_proof(
    sale_proof_id: int,
    _: dict = Depends(require_role("admin")),
    conn: Connection = Depends(get_db),
) -> SaleProofOut:
    return service.reject_sale_proof(conn, sale_proof_id)


@router.get("/payouts/mine", response_model=list[DoubleBenefitPayoutOut])
def my_payouts(
    user: dict = Depends(require_role("customer")),
    conn: Connection = Depends(get_db),
) -> list[DoubleBenefitPayoutOut]:
    return service.list_my_payouts(conn, user["id"])


@router.post("/payouts/{payout_id}/mark-paid")
def mark_payout_paid(
    payout_id: int,
    _: dict = Depends(require_role("admin")),
    conn: Connection = Depends(get_db),
) -> dict:
    service.mark_payout_paid(conn, payout_id)
    return {"status": "ok"}
