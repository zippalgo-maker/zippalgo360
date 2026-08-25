from fastapi import APIRouter, Depends
from sqlalchemy import Connection

from app.database import get_db
from app.deps import get_optional_current_user, require_company_type, require_role
from app.modules.listings import service
from app.modules.listings.schemas import ListingCreate, ListingMapMarker, ListingOut, ListingSummary
from app.modules.payments.repository import get_unlocked_listing_ids

router = APIRouter(prefix="/listings", tags=["listings"])


@router.post("", response_model=ListingOut)
def create_listing(
    payload: ListingCreate,
    user: dict = Depends(require_role("customer")),
    conn: Connection = Depends(get_db),
) -> ListingOut:
    return service.create_listing(conn, user["id"], payload)


@router.get("/mine", response_model=list[ListingOut])
def my_listings(
    user: dict = Depends(require_role("customer")),
    conn: Connection = Depends(get_db),
) -> list[ListingOut]:
    return service.list_my_listings(conn, user["id"])


@router.get("/public/active", response_model=list[ListingSummary])
def list_public_listings(
    complex_id: int | None = None,
    apartment_type_id: int | None = None,
    conn: Connection = Depends(get_db),
) -> list[ListingSummary]:
    return service.list_public_listings(conn, complex_id=complex_id, apartment_type_id=apartment_type_id)


@router.get("/map/markers", response_model=list[ListingMapMarker])
def list_map_markers(
    north: float | None = None,
    south: float | None = None,
    east: float | None = None,
    west: float | None = None,
    limit: int = 1000,
    conn: Connection = Depends(get_db),
) -> list[ListingMapMarker]:
    return service.list_map_markers(conn, north=north, south=south, east=east, west=west, limit=min(limit, 3000))


@router.get("/{listing_id}", response_model=ListingOut)
def get_listing(
    listing_id: int,
    viewer: dict | None = Depends(get_optional_current_user),
    conn: Connection = Depends(get_db),
) -> ListingOut:
    return service.get_listing(conn, listing_id, viewer)


@router.post("/{listing_id}/cancel", response_model=ListingOut)
def cancel_listing(
    listing_id: int,
    user: dict = Depends(require_role("customer")),
    conn: Connection = Depends(get_db),
) -> ListingOut:
    return service.cancel_listing(conn, user["id"], listing_id)


@router.get("/browse/active", response_model=list[ListingSummary])
def browse_active_listings(
    complex_id: int | None = None,
    apartment_type_id: int | None = None,
    company: dict = Depends(require_company_type("real_estate")),
    conn: Connection = Depends(get_db),
) -> list[ListingSummary]:
    unlocked_ids = get_unlocked_listing_ids(conn, company["id"])
    return service.browse_active_listings(
        conn, complex_id=complex_id, apartment_type_id=apartment_type_id, unlocked_ids=unlocked_ids
    )
