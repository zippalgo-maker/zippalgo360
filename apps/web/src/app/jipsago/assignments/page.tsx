"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRequireRole } from "@/lib/use-require-role";
import { cardClass, errorTextClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import type { AssignmentStatus, PurchaseRequest, PurchaseRequestAssignment } from "@/lib/types";

const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  unread: "미확인",
  read: "확인함",
  responded: "수락함",
  declined: "거절함",
  expired: "만료됨",
};

interface Row {
  assignment: PurchaseRequestAssignment;
  request: PurchaseRequest;
}

export default function MyAssignmentsPage() {
  const { token } = useAuth();
  useRequireRole("company");

  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function refresh() {
    if (!token) return;
    try {
      const assignments = await apiFetch<PurchaseRequestAssignment[]>("/purchase-requests/assignments/mine", {
        token,
      });
      const requests = await Promise.all(
        assignments.map((a) => apiFetch<PurchaseRequest>(`/purchase-requests/${a.purchase_request_id}`))
      );
      setRows(assignments.map((assignment, i) => ({ assignment, request: requests[i] })));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNeedsOnboarding(true);
      } else {
        setError(err instanceof ApiError ? err.message : "배정 목록을 불러오지 못했습니다.");
      }
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function respond(assignmentId: number, accept: boolean) {
    if (!token) return;
    setBusyId(assignmentId);
    setError(null);
    try {
      await apiFetch(`/purchase-requests/assignments/${assignmentId}/${accept ? "accept" : "decline"}`, {
        method: "POST",
        token,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-2xl font-bold text-ink">배정된 구매의뢰</h1>
      <p className="mt-2 text-sm text-muted">영업 지역과 일치하는 구매의뢰가 자동으로 배정됩니다.</p>

      {error && <p className={`${errorTextClass} mt-4`}>{error}</p>}

      {needsOnboarding && (
        <div className={`${cardClass} mt-6`}>
          <p className="text-sm text-ink">구매의뢰를 받으려면 먼저 공인중개사무소 정보를 등록해주세요.</p>
          <Link href="/onboarding/company" className="mt-3 inline-block text-sm font-semibold text-brand-red">
            업체 정보 등록하러 가기 →
          </Link>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {!needsOnboarding && rows.length === 0 && (
          <p className="text-sm text-muted">아직 배정된 구매의뢰가 없습니다.</p>
        )}
        {rows.map(({ assignment, request }) => (
          <div key={assignment.id} className={cardClass}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-ink">{request.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {request.sido} {request.sigungu}
                  {(request.desired_budget_min || request.desired_budget_max) &&
                    ` · ${request.desired_budget_min?.toLocaleString() ?? "-"}~${
                      request.desired_budget_max?.toLocaleString() ?? "-"
                    }원`}
                </p>
              </div>
              <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-muted">
                {ASSIGNMENT_STATUS_LABEL[assignment.status]}
              </span>
            </div>

            <p className="mt-2 text-sm text-muted">{request.description}</p>
            <p className="mt-1 text-xs text-muted">선호 연락 방법: {request.contact_method}</p>

            {(assignment.status === "unread" || assignment.status === "read") && (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={busyId === assignment.id}
                  onClick={() => respond(assignment.id, true)}
                  className={primaryButtonClass}
                >
                  수락하기
                </button>
                <button
                  type="button"
                  disabled={busyId === assignment.id}
                  onClick={() => respond(assignment.id, false)}
                  className={secondaryButtonClass}
                >
                  거절
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
