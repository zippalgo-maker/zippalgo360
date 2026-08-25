from fastapi import APIRouter, Depends
from sqlalchemy import Connection

from app.database import get_db
from app.deps import require_company_type
from app.modules.payments import service
from app.modules.payments.schemas import ListingPurchaseOut, ListingPurchaseResult

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/listings/{listing_id}/purchase", response_model=ListingPurchaseResult)
def purchase_listing_view(
    listing_id: int,
    company: dict = Depends(require_company_type("real_estate")),
    conn: Connection = Depends(get_db),
) -> ListingPurchaseResult:
    return service.purchase_listing_view(conn, company["id"], listing_id)


@router.get("/my-purchases", response_model=list[ListingPurchaseOut])
def my_purchases(
    company: dict = Depends(require_company_type("real_estate")),
    conn: Connection = Depends(get_db),
) -> list[ListingPurchaseOut]:
    return service.list_my_purchases(conn, company["id"])
