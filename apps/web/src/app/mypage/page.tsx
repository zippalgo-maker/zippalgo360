"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRequireRole } from "@/lib/use-require-role";
import { cardClass } from "@/lib/ui";
import type { Company } from "@/lib/types";

const CUSTOMER_LINKS = [
  { href: "/zippalgo/mine", title: "내 매물 관리", desc: "등록한 매물과 진행 상태를 확인하세요" },
  { href: "/zippalgo/payouts", title: "더블베네핏 정산 내역", desc: "매물이 팔리고 받은 정산금을 확인하세요" },
  { href: "/zipsago/mine", title: "내 구매의뢰", desc: "등록한 구매의뢰와 배정 현황을 확인하세요" },
];

const COMPANY_LINKS = [
  { href: "/partners", title: "파트너 센터", desc: "고객 요청, 열람 매물, 정산 현황을 한눈에 확인하세요" },
  { href: "/zippalgo/browse", title: "매물 둘러보기", desc: "건당 결제로 매물 상세 정보를 열람하세요" },
  { href: "/zipsago/assignments", title: "배정된 구매의뢰", desc: "나에게 배정된 구매의뢰에 응답하세요" },
];

export default function MyPage() {
  const { logout, token } = useAuth();
  const { user } = useRequireRole("customer", "company", "admin");
  const [company, setCompany] = useState<Company | null>(null);
  const [companyChecked, setCompanyChecked] = useState(false);

  useEffect(() => {
    if (!token || user?.role !== "company") {
      setCompanyChecked(true);
      return;
    }
    apiFetch<Company>("/companies/me", { token })
      .then(setCompany)
      .catch((err) => {
        if (!(err instanceof ApiError && err.status === 404)) {
          console.error(err);
        }
      })
      .finally(() => setCompanyChecked(true));
  }, [token, user?.role]);

  if (!user) return null;

  const links = user.role === "company" ? COMPANY_LINKS : CUSTOMER_LINKS;

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{user.name}님, 안녕하세요</h1>
          <p className="mt-1 text-sm text-muted">
            {user.email} · {user.role === "company" ? "공인중개사 회원" : "일반회원"}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:border-brand-red hover:text-brand-red"
        >
          로그아웃
        </button>
      </div>

      {user.role === "company" && companyChecked && (
        <div className={`${cardClass} mt-6`}>
          {company === null ? (
            <>
              <p className="font-semibold text-ink">업체 정보 등록이 필요해요</p>
              <p className="mt-1 text-sm text-muted">
                업체 정보를 등록해야 집팔고 매물 열람과 집사고 의뢰 배정을 받을 수 있어요.
              </p>
              <Link href="/onboarding/company" className="mt-3 inline-block text-sm font-semibold text-brand-red">
                업체 등록하러 가기 →
              </Link>
            </>
          ) : !company.is_active ? (
            <p className="text-sm font-semibold text-brand-red">
              업체 이용이 정지되었습니다. 문의가 필요하면 고객센터에 연락해주세요.
            </p>
          ) : !company.is_verified ? (
            <p className="text-sm font-semibold text-muted">
              업체 가입 심사 중이에요. 승인되면 매물 열람·의뢰 배정을 이용할 수 있어요.
            </p>
          ) : (
            <p className="text-sm font-semibold text-brand-green">승인된 업체입니다.</p>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={`${cardClass} block transition hover:border-brand-red`}>
            <p className="font-semibold text-ink">{link.title}</p>
            <p className="mt-1 text-sm text-muted">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
