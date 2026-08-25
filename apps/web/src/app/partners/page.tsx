"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import type { ListingPurchase, ListingSummary, PurchaseRequestAssignment } from "@/lib/types";

interface Stats {
  pendingRequests: number;
  inProgressRequests: number;
  totalSpent: number;
  acceptanceRate: number | null;
  browsableListings: number;
}

function DashboardCard({ title, desc, value }: { title: string; desc: string; value: string }) {
  return (
    <article className={cardClass}>
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-xs text-muted">{desc}</p>
      <strong className="mt-4 block text-3xl font-black text-brand-red">{value}</strong>
    </article>
  );
}

function PartnerDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch<PurchaseRequestAssignment[]>("/purchase-requests/assignments/mine", { token }),
      apiFetch<ListingPurchase[]>("/payments/my-purchases", { token }),
      apiFetch<ListingSummary[]>("/listings/browse/active", { token }),
    ])
      .then(([assignments, purchases, listings]) => {
        const pending = assignments.filter((a) => a.status === "unread" || a.status === "read").length;
        const inProgress = assignments.filter((a) => a.status === "responded").length;
        const decided = assignments.filter((a) => a.status === "responded" || a.status === "declined").length;
        const accepted = assignments.filter((a) => a.status === "responded").length;
        setStats({
          pendingRequests: pending,
          inProgressRequests: inProgress,
          totalSpent: purchases.reduce((sum, p) => sum + p.amount, 0),
          acceptanceRate: decided > 0 ? Math.round((accepted / decided) * 100) : null,
          browsableListings: listings.filter((l) => !l.is_unlocked).length,
        });
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNeedsOnboarding(true);
      });
  }, [token]);

  if (needsOnboarding) {
    return (
      <div className={`${cardClass} mt-8`}>
        <p className="font-semibold text-ink">파트너 센터를 이용하려면 업체 정보 등록이 필요해요.</p>
        <Link href="/onboarding/company" className={`${primaryButtonClass} mt-4 inline-flex w-auto px-6`}>
          업체 정보 등록하기
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="mt-14 text-xl font-bold text-ink">파트너 센터 대시보드</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="고객 요청 확인"
          desc="아직 응답하지 않은 집사고 구매의뢰"
          value={stats ? `${stats.pendingRequests}건` : "-"}
        />
        <DashboardCard
          title="열람 가능 매물"
          desc="건당 결제로 열람할 수 있는 집팔고 매물"
          value={stats ? `${stats.browsableListings}건` : "-"}
        />
        <DashboardCard
          title="누적 결제 금액"
          desc="매물 열람에 사용한 건당 결제 누적액"
          value={stats ? `${stats.totalSpent.toLocaleString()}원` : "-"}
        />
        <DashboardCard
          title="구매의뢰 수락률"
          desc="응답한 구매의뢰 중 수락한 비율"
          value={stats ? (stats.acceptanceRate !== null ? `${stats.acceptanceRate}%` : "응답 이력 없음") : "-"}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/jipsago/assignments" className={`${primaryButtonClass} w-auto px-6`}>
          배정된 구매의뢰 보기
        </Link>
        <Link href="/jipalgo/browse" className={`${secondaryButtonClass} w-auto px-6`}>
          매물 둘러보기
        </Link>
      </div>
    </>
  );
}

export default function PartnersPage() {
  const { user, isLoading } = useAuth();

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-10">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
        <div className={cardClass}>
          <span className="inline-flex rounded-full bg-brand-red-soft px-4 py-1.5 text-xs font-bold text-brand-red">
            통합 파트너 센터
          </span>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
            집팔고 · 집사고 · 집테리어
            <br />
            업무를 한 곳에서
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            중개사, 인테리어 시공사, 향후 집사고 파트너가 고객 요청부터 제안, 계약, 정산, 성과까지
            관리하는 통합 업무 공간입니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["집팔고", "집사고", "집테리어 연동 예정"].map((label) => (
              <span key={label} className="rounded-full bg-soft px-3 py-1.5 text-xs font-bold text-ink">
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className={cardClass}>
          {isLoading ? null : !user ? (
            <>
              <h2 className="text-lg font-bold text-ink">파트너 로그인이 필요해요</h2>
              <p className="mt-2 text-sm text-muted">
                공인중개사 회원으로 로그인하거나, 아직 가입 전이라면 파트너로 가입해주세요.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <Link href="/login" className={primaryButtonClass}>
                  로그인
                </Link>
                <Link href="/register?type=company" className={secondaryButtonClass}>
                  공인중개사 파트너 가입
                </Link>
              </div>
            </>
          ) : user.role !== "company" ? (
            <>
              <h2 className="text-lg font-bold text-ink">파트너 전용 공간이에요</h2>
              <p className="mt-2 text-sm text-muted">
                일반회원으로 로그인되어 있어요. 파트너 센터는 공인중개사 등 업체 회원만 이용할 수
                있습니다.
              </p>
              <Link href="/register?type=company" className={`${primaryButtonClass} mt-5`}>
                공인중개사로 별도 가입하기
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-ink">환영합니다</h2>
              <p className="mt-2 text-sm text-muted">
                아래 대시보드에서 배정된 구매의뢰와 열람 가능한 매물을 확인하세요.
              </p>
            </>
          )}
        </div>
      </div>

      {user?.role === "company" && <PartnerDashboard />}
    </div>
  );
}
