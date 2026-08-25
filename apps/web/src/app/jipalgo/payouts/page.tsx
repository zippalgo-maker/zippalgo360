"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRequireRole } from "@/lib/use-require-role";
import { cardClass } from "@/lib/ui";
import type { DoubleBenefitPayout, PayoutStatus } from "@/lib/types";

const STATUS_LABEL: Record<PayoutStatus, string> = {
  pending: "지급 대기",
  paid: "지급 완료",
  cancelled: "취소됨",
};

export default function PayoutsPage() {
  const { token } = useAuth();
  useRequireRole("customer");

  const [payouts, setPayouts] = useState<DoubleBenefitPayout[]>([]);

  useEffect(() => {
    if (!token) return;
    apiFetch<DoubleBenefitPayout[]>("/double-benefit/payouts/mine", { token }).then(setPayouts);
  }, [token]);

  const totalPending = payouts.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = payouts.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-2xl font-bold text-ink">더블베네핏 정산 내역</h1>
      <p className="mt-2 text-sm text-muted">매물이 팔리고 매도증빙이 승인되면 정산금이 지급됩니다.</p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className={cardClass}>
          <p className="text-sm text-muted">지급 대기</p>
          <p className="mt-1 text-xl font-bold text-brand-red">{totalPending.toLocaleString()}원</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-muted">누적 지급</p>
          <p className="mt-1 text-xl font-bold text-brand-red">{totalPaid.toLocaleString()}원</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {payouts.length === 0 && <p className="text-sm text-muted">아직 정산 내역이 없습니다.</p>}
        {payouts.map((payout) => (
          <div key={payout.id} className={`${cardClass} flex items-center justify-between`}>
            <div>
              <p className="font-semibold text-ink">매물 #{payout.listing_id}</p>
              <p className="text-sm text-muted">{new Date(payout.created_at).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-ink">{payout.amount.toLocaleString()}원</p>
              <p className="text-xs text-muted">{STATUS_LABEL[payout.status]}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
