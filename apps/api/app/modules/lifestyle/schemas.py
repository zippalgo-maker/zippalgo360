from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel


class LifestyleServiceType(str, Enum):
    moving = "moving"
    move_out_cleaning = "move_out_cleaning"
    living_cleaning = "living_cleaning"
    appliance = "appliance"
    furniture = "furniture"
    subscription = "subscription"


class InterestRegistrationCreate(BaseModel):
    service_type: LifestyleServiceType
    name: str
    phone: str
    region: str
    desired_date: date | None = None
    memo: str | None = None
    pyeong: int | None = None
    home_style: str | None = None


class InterestRegistrationOut(BaseModel):
    id: int
    service_type: LifestyleServiceType
    name: str
    phone: str
    region: str
    desired_date: date | None
    memo: str | None
    pyeong: int | None = None
    home_style: str | None = None
    created_at: datetime
