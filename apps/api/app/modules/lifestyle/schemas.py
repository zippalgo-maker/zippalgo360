from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel


class LifestyleServiceType(str, Enum):
    moving = "moving"
    cleaning = "cleaning"


class InterestRegistrationCreate(BaseModel):
    service_type: LifestyleServiceType
    name: str
    phone: str
    region: str
    desired_date: date | None = None
    memo: str | None = None


class InterestRegistrationOut(BaseModel):
    id: int
    service_type: LifestyleServiceType
    name: str
    phone: str
    region: str
    desired_date: date | None
    memo: str | None
    created_at: datetime
