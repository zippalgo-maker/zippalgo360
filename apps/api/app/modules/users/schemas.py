from datetime import datetime
from enum import Enum

from pydantic import BaseModel, EmailStr


class UserRole(str, Enum):
    customer = "customer"
    company = "company"
    admin = "admin"


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str | None = None
    role: UserRole = UserRole.customer


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    phone: str | None
    role: UserRole
    is_active: bool
    created_at: datetime


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class SsoCodeOut(BaseModel):
    code: str
    expires_in: int


class SsoVerifyIn(BaseModel):
    code: str


class SsoVerifyOut(BaseModel):
    user_id: int
    email: str
    name: str
    role: UserRole


class MapLayerPreferenceIn(BaseModel):
    layers: list[str]


class MapLayerPreferenceOut(BaseModel):
    layers: list[str]
