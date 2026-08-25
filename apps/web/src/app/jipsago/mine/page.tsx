"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRequireRole } from "@/lib/use-require-role";
import { cardClass } from "@/lib/ui";
import type {
  AssignmentStatus,
  PurchaseRequest,
  PurchaseRequestAssignment,
  PurchaseRequestStatus,
} from "@/lib/types";

const REQUEST_STATUS_LABEL: Record<PurchaseRequestStatus, string> = {
  submitted: "접수됨",
  in_progress: "중개사 배정됨",
  matched: "매칭 완료",
  closed: "종료",
};

const REQUEST_STATUS_COLOR: Record<PurchaseRequestStatus, string> = {
  submitted: "bg-soft text-muted",
  in_progress: "bg-brand-green-soft text-brand-green",
  matched: "bg-brand-green text-white",
  closed: "bg-soft text-muted",
};

const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  unread: "확인 전",
  read: "확인함",
  responded: "수락함",
  declined: "거절함",
  expired: "만료됨",
};

function AssignmentList({ requestId, token }: { requestId: number; token: string }) {
  const [assignments, setAssignments] = useState<PurchaseRequestAssignment[]>([]);

  useEffect(() => {
    apiFetch<PurchaseRequestAssignment[]>(`/purchase-requests/${requestId}/assignments`, { token }).then(
      setAssignments
    );
  }, [requestId, token]);

  if (assignments.length === 0) {
    return <p className="mt-3 text-sm text-muted">아직 배정된 중개사가 없어요. 지역을 확인해주세요.</p>;
  }

  return (
    <ul className="mt-3 space-y-2 border-t border-line pt-3">
      {assignments.map((a) => (
        <li key={a.id} className="flex items-center justify-between text-sm">
          <span className="text-ink">중개사무소 #{a.agent_company_id}</span>
          <span className="text-muted">{ASSIGNMENT_STATUS_LABEL[a.status]}</span>
        </li>
      ))}
    </ul>
  );
}

export default function MyPurchaseRequestsPage() {
  const { token } = useAuth();
  useRequireRole("customer");

  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<PurchaseRequest[]>("/purchase-requests/mine", { token }).then(setRequests);
  }, [token]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">내 구매의뢰</h1>
        <Link href="/jipsago/new" className="text-sm font-semibold text-brand-green">
          + 구매의뢰 등록
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        {requests.length === 0 && <p className="text-sm text-muted">등록한 구매의뢰가 없습니다.</p>}
        {requests.map((req) => (
          <div key={req.id} className={cardClass}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-ink">{req.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {req.sido} {req.sigungu}
                  {(req.desired_budget_min || req.desired_budget_max) &&
                    ` · ${req.desired_budget_min?.toLocaleString() ?? "-"}~${
                      req.desired_budget_max?.toLocaleString() ?? "-"
                    }원`}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${REQUEST_STATUS_COLOR[req.status]}`}
              >
                {REQUEST_STATUS_LABEL[req.status]}
              </span>
            </div>

            <p className="mt-2 text-sm text-muted">{req.description}</p>

            <button
              type="button"
              onClick={() => setExpanded(expanded === req.id ? null : req.id)}
              className="mt-3 text-sm font-semibold text-brand-green"
            >
              {expanded === req.id ? "배정 현황 접기 ▲" : "배정 현황 보기 ▼"}
            </button>

            {expanded === req.id && token && <AssignmentList requestId={req.id} token={token} />}
          </div>
        ))}
      </div>
    </div>
  );
}
