from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class CompanyType(str, Enum):
    real_estate = "real_estate"
    interior = "interior"
    mover = "mover"
    cleaner = "cleaner"


class CompanyCreate(BaseModel):
    company_type: CompanyType
    business_name: str
    business_registration_number: str
    representative_name: str
    address: str
    phone: str
    service_regions: list[str] = []


class CompanyOut(BaseModel):
    id: int
    owner_user_id: int
    company_type: CompanyType
    business_name: str
    business_registration_number: str
    representative_name: str
    address: str
    phone: str
    latitude: float | None = None
    longitude: float | None = None
    is_verified: bool
    is_active: bool
    created_at: datetime
    service_regions: list[str] = []


class CompanyMapMarker(BaseModel):
    id: int
    company_type: CompanyType
    business_name: str
    latitude: float
    longitude: float
