from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class SaleProofStatus(str, Enum):
    submitted = "submitted"
    verified = "verified"
    rejected = "rejected"


class PayoutStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    cancelled = "cancelled"


class SaleProofCreate(BaseModel):
    listing_id: int
    listing_purchase_id: int
    document_path: str
    sale_price: int


class SaleProofOut(BaseModel):
    id: int
    listing_id: int
    listing_purchase_id: int
    uploaded_by: int
    document_path: str
    sale_price: int
    status: SaleProofStatus
    created_at: datetime
    verified_at: datetime | None


class DoubleBenefitPayoutOut(BaseModel):
    id: int
    listing_id: int
    sale_proof_id: int
    agent_company_id: int
    seller_id: int
    amount: int
    status: PayoutStatus
    paid_at: datetime | None
    created_at: datetime
