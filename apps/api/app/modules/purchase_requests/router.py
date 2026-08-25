from fastapi import APIRouter, Depends
from sqlalchemy import Connection

from app.database import get_db
from app.deps import require_company_type, require_role
from app.modules.purchase_requests import service
from app.modules.purchase_requests.schemas import (
    PurchaseRequestAssignmentOut,
    PurchaseRequestCreate,
    PurchaseRequestOut,
)

router = APIRouter(prefix="/purchase-requests", tags=["purchase-requests"])


@router.post("", response_model=PurchaseRequestOut)
def create_purchase_request(
    payload: PurchaseRequestCreate,
    user: dict = Depends(require_role("customer")),
    conn: Connection = Depends(get_db),
) -> PurchaseRequestOut:
    return service.create_purchase_request(conn, user["id"], payload)


@router.get("/mine", response_model=list[PurchaseRequestOut])
def my_requests(
    user: dict = Depends(require_role("customer")),
    conn: Connection = Depends(get_db),
) -> list[PurchaseRequestOut]:
    return service.list_my_requests(conn, user["id"])


@router.get("/{request_id}", response_model=PurchaseRequestOut)
def get_request(request_id: int, conn: Connection = Depends(get_db)) -> PurchaseRequestOut:
    return service.get_request(conn, request_id)


@router.get("/{request_id}/assignments", response_model=list[PurchaseRequestAssignmentOut])
def list_assignments(
    request_id: int,
    user: dict = Depends(require_role("customer")),
    conn: Connection = Depends(get_db),
) -> list[PurchaseRequestAssignmentOut]:
    return service.list_assignments(conn, request_id)


@router.get("/assignments/mine", response_model=list[PurchaseRequestAssignmentOut])
def my_assigned_requests(
    company: dict = Depends(require_company_type("real_estate")),
    conn: Connection = Depends(get_db),
) -> list[PurchaseRequestAssignmentOut]:
    return service.list_my_assigned_requests(conn, company["id"])


@router.post("/assignments/{assignment_id}/accept", response_model=PurchaseRequestAssignmentOut)
def accept_assignment(
    assignment_id: int,
    company: dict = Depends(require_company_type("real_estate")),
    conn: Connection = Depends(get_db),
) -> PurchaseRequestAssignmentOut:
    return service.respond_to_assignment(conn, company["id"], assignment_id, accept=True)


@router.post("/assignments/{assignment_id}/decline", response_model=PurchaseRequestAssignmentOut)
def decline_assignment(
    assignment_id: int,
    company: dict = Depends(require_company_type("real_estate")),
    conn: Connection = Depends(get_db),
) -> PurchaseRequestAssignmentOut:
    return service.respond_to_assignment(conn, company["id"], assignment_id, accept=False)
