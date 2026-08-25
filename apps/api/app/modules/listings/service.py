from fastapi import HTTPException, status
from sqlalchemy import Connection

from app.modules.companies import repository as companies_repository
from app.modules.listings import repository
from app.modules.listings.schemas import ListingCreate, ListingOut, ListingSummary
from app.modules.payments import repository as payments_repository


def create_listing(conn: Connection, seller_id: int, payload: ListingCreate) -> ListingOut:
    listing = repository.create_listing(conn, seller_id=seller_id, **payload.model_dump())
    return ListingOut(**listing)


def _can_view_unmasked(conn: Connection, listing: dict, viewer: dict | None) -> bool:
    if viewer is None:
        return False
    if viewer["id"] == listing["seller_id"]:
        return True
    if viewer["role"] == "company":
        company = companies_repository.get_company_by_owner(conn, viewer["id"])
        if company is not None and payments_repository.get_purchase(conn, listing["id"], company["id"]) is not None:
            return True
    return False


def get_listing(conn: Connection, listing_id: int, viewer: dict | None = None) -> ListingOut:
    listing = repository.get_listing_by_id(conn, listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="매물을 찾을 수 없습니다.")

    if not _can_view_unmasked(conn, listing, viewer):
        listing = {**listing, "dong": None, "ho": None}

    return ListingOut(**listing)


def list_my_listings(conn: Connection, seller_id: int) -> list[ListingOut]:
    return [ListingOut(**l) for l in repository.list_listings_by_seller(conn, seller_id)]


def browse_active_listings(
    conn: Connection,
    *,
    complex_id: int | None,
    apartment_type_id: int | None,
    unlocked_ids: set[int],
) -> list[ListingSummary]:
    listings = repository.list_active_listings(conn, complex_id=complex_id, apartment_type_id=apartment_type_id)
    return [
        ListingSummary(**listing, is_unlocked=listing["id"] in unlocked_ids)
        for listing in listings
    ]


def list_public_listings(
    conn: Connection, *, complex_id: int | None, apartment_type_id: int | None
) -> list[ListingSummary]:
    """비로그인 방문자도 볼 수 있는 매물 목록(마스킹). 지도/공개 브라우징용."""
    listings = repository.list_active_listings(conn, complex_id=complex_id, apartment_type_id=apartment_type_id)
    return [ListingSummary(**listing, is_unlocked=False) for listing in listings]


def cancel_listing(conn: Connection, seller_id: int, listing_id: int) -> ListingOut:
    listing = repository.get_listing_by_id(conn, listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="매물을 찾을 수 없습니다.")
    if listing["seller_id"] != seller_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="본인 매물만 취소할 수 있습니다.")
    if listing["status"] != "active":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="진행 중인 매물만 취소할 수 있습니다.")

    repository.update_status(conn, listing_id, "cancelled")
    return ListingOut(**repository.get_listing_by_id(conn, listing_id))
