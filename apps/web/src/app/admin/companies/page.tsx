"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRequireRole } from "@/lib/use-require-role";
import { cardClass, errorTextClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import type { CompanyAdmin } from "@/lib/types";

const COMPANY_TYPE_LABEL: Record<string, string> = {
  real_estate: "공인중개사",
  interior: "인테리어",
  mover: "이사",
  cleaner: "청소",
};

export default function AdminCompaniesPage() {
  const { token } = useAuth();
  useRequireRole("admin");

  const [companies, setCompanies] = useState<CompanyAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function refresh() {
    if (!token) return;
    const list = await apiFetch<CompanyAdmin[]>("/companies/admin", { token });
    setCompanies(list);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleAction(id: number, action: "verify" | "suspend" | "reactivate") {
    if (!token) return;
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/companies/${id}/${action}`, { method: "POST", token });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-2xl font-bold text-ink">업체 승인 관리</h1>
      <p className="mt-2 text-sm text-muted">
        새로 가입한 업체를 검토하고 승인/정지 처리합니다.
      </p>

      {error && <p className={`${errorTextClass} mt-4`}>{error}</p>}

      <div className="mt-6 space-y-4">
        {companies.length === 0 && <p className="text-sm text-muted">등록된 업체가 없습니다.</p>}
        {companies.map((company) => (
          <div key={company.id} className={cardClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-ink">
                  {company.business_name}{" "}
                  <span className="text-xs font-normal text-muted">
                    ({COMPANY_TYPE_LABEL[company.company_type] ?? company.company_type})
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted">
                  대표 {company.representative_name} · {company.owner_name}({company.owner_email})
                </p>
                <p className="text-sm text-muted">{company.address}</p>
                <p className="text-sm text-muted">사업자등록번호 {company.business_registration_number}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    company.is_verified ? "bg-brand-green-soft text-brand-green" : "bg-soft text-muted"
                  }`}
                >
                  {company.is_verified ? "승인됨" : "심사중"}
                </span>
                {!company.is_active && (
                  <span className="rounded-full bg-brand-red-soft px-3 py-1 text-xs font-semibold text-brand-red">
                    정지됨
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              {!company.is_verified && (
                <button
                  type="button"
                  disabled={busyId === company.id}
                  onClick={() => handleAction(company.id, "verify")}
                  className={primaryButtonClass}
                >
                  승인
                </button>
              )}
              {company.is_active ? (
                <button
                  type="button"
                  disabled={busyId === company.id}
                  onClick={() => handleAction(company.id, "suspend")}
                  className={secondaryButtonClass}
                >
                  정지
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busyId === company.id}
                  onClick={() => handleAction(company.id, "reactivate")}
                  className={secondaryButtonClass}
                >
                  정지 해제
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
