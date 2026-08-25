from fastapi import HTTPException, status
from sqlalchemy import Connection

from app.modules.listings import repository as listings_repository
from app.modules.payments import repository
from app.modules.payments.schemas import ListingPurchaseOut, ListingPurchaseResult
from app.modules.listings.schemas import ListingOut


def purchase_listing_view(conn: Connection, agent_company_id: int, listing_id: int) -> ListingPurchaseResult:
    listing = listings_repository.get_listing_by_id(conn, listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="매물을 찾을 수 없습니다.")
    if listing["status"] != "active":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="열람 결제가 불가능한 매물입니다.")

    existing = repository.get_purchase(conn, listing_id, agent_company_id)
    if existing is not None:
        return ListingPurchaseResult(purchase=ListingPurchaseOut(**existing), listing=ListingOut(**listing))

    # TODO: 실제 PG 연동 전까지는 즉시 결제 완료로 처리하는 모의 결제입니다.
    purchase = repository.create_purchase(
        conn, listing_id=listing_id, agent_company_id=agent_company_id, amount=listing["view_price"]
    )
    return ListingPurchaseResult(purchase=ListingPurchaseOut(**purchase), listing=ListingOut(**listing))


def list_my_purchases(conn: Connection, agent_company_id: int) -> list[ListingPurchaseOut]:
    return [ListingPurchaseOut(**p) for p in repository.list_purchases_by_company(conn, agent_company_id)]
