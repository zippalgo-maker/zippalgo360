"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRequireRole } from "@/lib/use-require-role";
import { cardClass, errorTextClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import type { SaleProof } from "@/lib/types";

export default function AdminSaleProofsPage() {
  const { token } = useAuth();
  useRequireRole("admin");

  const [proofs, setProofs] = useState<SaleProof[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function refresh() {
    if (!token) return;
    const list = await apiFetch<SaleProof[]>("/double-benefit/sale-proofs/pending", { token });
    setProofs(list);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleVerify(id: number) {
    if (!token) return;
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/double-benefit/sale-proofs/${id}/verify`, { method: "POST", token });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: number) {
    if (!token) return;
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/double-benefit/sale-proofs/${id}/reject`, { method: "POST", token });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-2xl font-bold text-ink">매도증빙 검토</h1>
      <p className="mt-2 text-sm text-muted">
        승인하면 매물이 판매완료로 전환되고 더블베네핏 정산이 생성됩니다.
      </p>

      {error && <p className={`${errorTextClass} mt-4`}>{error}</p>}

      <div className="mt-6 space-y-4">
        {proofs.length === 0 && <p className="text-sm text-muted">검토 대기 중인 증빙이 없습니다.</p>}
        {proofs.map((proof) => (
          <div key={proof.id} className={cardClass}>
            <p className="font-semibold text-ink">매물 #{proof.listing_id}</p>
            <p className="mt-1 text-sm text-muted">매도가: {proof.sale_price.toLocaleString()}원</p>
            <p className="text-sm text-muted">증빙 서류: {proof.document_path}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={busyId === proof.id}
                onClick={() => handleVerify(proof.id)}
                className={primaryButtonClass}
              >
                승인 (정산 생성)
              </button>
              <button
                type="button"
                disabled={busyId === proof.id}
                onClick={() => handleReject(proof.id)}
                className={secondaryButtonClass}
              >
                반려
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
