from fastapi import HTTPException, status
from sqlalchemy import Connection

from app.modules.purchase_requests import repository
from app.modules.purchase_requests.schemas import (
    PurchaseRequestAssignmentOut,
    PurchaseRequestCreate,
    PurchaseRequestOut,
)


def create_purchase_request(conn: Connection, customer_id: int, payload: PurchaseRequestCreate) -> PurchaseRequestOut:
    request = repository.create_purchase_request(conn, customer_id=customer_id, **payload.model_dump())

    agent_company_ids = repository.find_agent_companies_by_region(conn, payload.sido, payload.sigungu)
    if agent_company_ids:
        repository.assign_agents(conn, request["id"], agent_company_ids)
        repository.update_request_status(conn, request["id"], "in_progress")
        request["status"] = "in_progress"

    return PurchaseRequestOut(**request)


def list_my_requests(conn: Connection, customer_id: int) -> list[PurchaseRequestOut]:
    return [PurchaseRequestOut(**r) for r in repository.list_by_customer(conn, customer_id)]


def get_request(conn: Connection, request_id: int) -> PurchaseRequestOut:
    request = repository.get_purchase_request(conn, request_id)
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="구매의뢰를 찾을 수 없습니다.")
    return PurchaseRequestOut(**request)


def list_assignments(conn: Connection, request_id: int) -> list[PurchaseRequestAssignmentOut]:
    return [PurchaseRequestAssignmentOut(**a) for a in repository.list_assignments_by_request(conn, request_id)]


def list_my_assigned_requests(conn: Connection, agent_company_id: int) -> list[PurchaseRequestAssignmentOut]:
    return [
        PurchaseRequestAssignmentOut(**a)
        for a in repository.list_assignments_by_company(conn, agent_company_id)
    ]


def respond_to_assignment(
    conn: Connection, agent_company_id: int, assignment_id: int, accept: bool
) -> PurchaseRequestAssignmentOut:
    assignment = repository.get_assignment(conn, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="배정 내역을 찾을 수 없습니다.")
    if assignment["agent_company_id"] != agent_company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="본인에게 배정된 건이 아닙니다.")
    if assignment["status"] not in ("unread", "read"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 응답한 배정입니다.")

    new_status = "responded" if accept else "declined"
    repository.update_assignment_status(conn, assignment_id, new_status)

    if accept:
        repository.update_request_status(conn, assignment["purchase_request_id"], "matched")

    return PurchaseRequestAssignmentOut(**repository.get_assignment(conn, assignment_id))
