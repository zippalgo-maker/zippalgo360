from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel


class ListingStatus(str, Enum):
    active = "active"
    reserved = "reserved"
    sold = "sold"
    cancelled = "cancelled"


class ListingCreate(BaseModel):
    complex_id: int
    apartment_type_id: int
    dong: str | None = None
    ho: str | None = None
    asking_price: int
    description: str
    move_in_date: date | None = None
    view_price: int = 30000


class ListingOut(BaseModel):
    id: int
    seller_id: int
    complex_id: int
    apartment_type_id: int
    dong: str | None
    ho: str | None
    asking_price: int
    description: str
    move_in_date: date | None
    view_price: int
    status: ListingStatus
    created_at: datetime
    updated_at: datetime
    images: list[str] = []


class ListingSummary(BaseModel):
    """중개사가 미결제 상태에서 보는 마스킹된 매물 정보 (동/호는 결제 후 공개)."""

    id: int
    complex_id: int
    apartment_type_id: int
    asking_price: int
    description: str
    view_price: int
    status: ListingStatus
    created_at: datetime
    is_unlocked: bool = False


class ListingMapMarker(BaseModel):
    id: int
    complex_id: int
    apartment_type_id: int
    complex_name: str
    latitude: float
    longitude: float
    sido: str
    sigungu: str | None
    asking_price: int
    view_price: int
    status: ListingStatus
