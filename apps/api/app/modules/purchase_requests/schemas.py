from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel


class PurchaseRequestStatus(str, Enum):
    submitted = "submitted"
    in_progress = "in_progress"
    matched = "matched"
    closed = "closed"


class AssignmentStatus(str, Enum):
    unread = "unread"
    read = "read"
    responded = "responded"
    declined = "declined"
    expired = "expired"


class PurchaseRequestCreate(BaseModel):
    title: str
    sido: str
    sigungu: str
    complex_id: int | None = None
    apartment_type_id: int | None = None
    desired_budget_min: int | None = None
    desired_budget_max: int | None = None
    desired_move_in_date: date | None = None
    room_count_min: int | None = None
    description: str
    contact_method: str = "phone"


class PurchaseRequestOut(BaseModel):
    id: int
    customer_id: int
    title: str
    sido: str
    sigungu: str
    complex_id: int | None
    apartment_type_id: int | None
    desired_budget_min: int | None
    desired_budget_max: int | None
    desired_move_in_date: date | None
    room_count_min: int | None
    description: str
    contact_method: str
    status: PurchaseRequestStatus
    created_at: datetime


class PurchaseRequestAssignmentOut(BaseModel):
    id: int
    purchase_request_id: int
    agent_company_id: int
    assignment_order: int
    status: AssignmentStatus
    responded_at: datetime | None
    created_at: datetime
