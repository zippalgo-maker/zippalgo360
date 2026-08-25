"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRequireRole } from "@/lib/use-require-role";
import { cardClass } from "@/lib/ui";

const CUSTOMER_LINKS = [
  { href: "/jipalgo/mine", title: "내 매물 관리", desc: "등록한 매물과 진행 상태를 확인하세요" },
  { href: "/jipalgo/payouts", title: "더블베네핏 정산 내역", desc: "매물이 팔리고 받은 정산금을 확인하세요" },
  { href: "/jipsago/mine", title: "내 구매의뢰", desc: "등록한 구매의뢰와 배정 현황을 확인하세요" },
];

const COMPANY_LINKS = [
  { href: "/partners", title: "파트너 센터", desc: "고객 요청, 열람 매물, 정산 현황을 한눈에 확인하세요" },
  { href: "/jipalgo/browse", title: "매물 둘러보기", desc: "건당 결제로 매물 상세 정보를 열람하세요" },
  { href: "/jipsago/assignments", title: "배정된 구매의뢰", desc: "나에게 배정된 구매의뢰에 응답하세요" },
];

export default function MyPage() {
  const { logout } = useAuth();
  const { user } = useRequireRole("customer", "company", "admin");

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
