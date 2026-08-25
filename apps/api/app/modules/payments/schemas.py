from datetime import datetime
from enum import Enum

from pydantic import BaseModel

from app.modules.listings.schemas import ListingOut


class PaymentStatus(str, Enum):
    paid = "paid"
    refunded = "refunded"


class ListingPurchaseOut(BaseModel):
    id: int
    listing_id: int
    agent_company_id: int
    amount: int
    status: PaymentStatus
    paid_at: datetime


class ListingPurchaseResult(BaseModel):
    purchase: ListingPurchaseOut
    listing: ListingOut
