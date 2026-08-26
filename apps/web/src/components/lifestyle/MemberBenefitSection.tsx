"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  CATEGORY_LIST,
  formatMemberPriceRange,
  formatPriceRange,
} from "@/lib/lifestyle-data";
import { primaryButtonClass } from "@/lib/ui";

export default function MemberBenefitSection() {
  const { user, isLoading } = useAuth();
  const isMember = !isLoading && !!user;

  return (
    <section className="bg-brand-green-soft">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-green">MEMBER BENEFIT</p>
            <h2 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">
              집팔고360 회원이면, 더 저렴하게
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              집팔고·집사고·집테리어를 이용 중인 집팔고360 회원이라면 로그인만으로 집서비스
              전 카테고리에 회원가 혜택이 자동 적용돼요.
            </p>
          </div>

          {isMember ? (
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white">
              <CheckDot /> {user?.name}님은 회원가 적용 대상이에요
            </span>
          ) : (
            <Link href="/register" className={`${primaryButtonClass} w-fit`}>
              무료 회원가입하고 회원가 확인하기
            </Link>
          )}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_LIST.map((c) => (
            <div
              key={c.value}
              className="rounded-2xl border border-line bg-white p-5 shadow-brand"
            >
              <p className="text-sm font-semibold text-ink">{c.label}</p>

              {c.priceRange ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">일반가</span>
                    <span className="text-ink/70 line-through decoration-muted/60">
                      {formatPriceRange(c.priceRange)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-brand-green">회원가</span>
                    <span className="font-bold text-brand-green">
                      {formatMemberPriceRange(c.priceRange, c.memberDiscountPct ?? 0)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">{c.memberBenefitNote}</p>
              )}

              {c.priceRange && c.memberDiscountPct && (
                <span className="mt-4 inline-block rounded-full bg-brand-green-soft px-3 py-1 text-xs font-bold text-brand-green">
                  최대 {c.memberDiscountPct}% 할인
                </span>
              )}
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted">
          * 위 가격은 참고용 평균 시세 범위이며, 실제 견적은 지역·평형·현장 상황에 따라 달라질 수
          있어요. 정확한 금액은 견적 신청 후 제휴 업체가 안내해드려요.
        </p>
      </div>
    </section>
  );
}

function CheckDot() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4l2.3 2.3 6.3-6.3a1 1 0 0 1 1.4 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
