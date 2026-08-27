"use client";

import Link from "next/link";
import { useRequireRole } from "@/lib/use-require-role";
import { cardClass } from "@/lib/ui";

const ADMIN_LINKS = [
  { href: "/admin/members", title: "회원 관리", desc: "통합회원 역할·활성 상태 관리" },
  { href: "/admin/companies", title: "업체 승인 관리", desc: "신규 업체 가입 검토 및 승인/정지" },
  { href: "/admin/apartments", title: "단지 마스터데이터", desc: "아파트 단지/평형 정보 관리" },
  { href: "/admin/sale-proofs", title: "매도증빙 검토", desc: "더블베네핏 정산을 위한 매도증빙 승인" },
];

export default function AdminHomePage() {
  useRequireRole("admin");

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-2xl font-bold text-ink">집팔고360 통합 관리자</h1>
      <p className="mt-2 text-sm text-muted">회원·결제 등 서비스 공통 항목을 관리합니다.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {ADMIN_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={`${cardClass} block transition hover:border-brand-red`}>
            <p className="font-semibold text-ink">{link.title}</p>
            <p className="mt-1 text-sm text-muted">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
