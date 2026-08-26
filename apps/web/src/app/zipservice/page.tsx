"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { PROCESS_STEPS } from "@/lib/lifestyle-data";
import MemberBenefitSection from "@/components/lifestyle/MemberBenefitSection";
import CategoryGrid from "@/components/lifestyle/CategoryGrid";
import FeaturedCompanies from "@/components/lifestyle/FeaturedCompanies";
import ZipServiceFaq from "@/components/lifestyle/ZipServiceFaq";
import MobileStickyCta from "@/components/lifestyle/MobileStickyCta";

const TRUST_ITEMS = [
  {
    title: "집팔고360 통합회원 혜택",
    desc: "집팔고·집사고·집테리어와 같은 계정으로, 로그인만 하면 회원가가 자동 적용돼요.",
  },
  {
    title: "엄선된 제휴 업체만 연결",
    desc: "집테리어 검증 기준에 준하는 심사를 거친 업체만 견적을 보내드려요.",
  },
  {
    title: "평형·스타일 AI 추천",
    desc: "내 집 평형과 원하는 스타일을 입력하면 가전·가구를 AI가 맞춤 추천해드려요.",
  },
  {
    title: "1분이면 신청 끝",
    desc: "몇 가지 질문에 답하기만 하면 신청 완료, 이후 업체가 먼저 연락드려요.",
  },
];

export default function ZipServicePage() {
  const { user, isLoading } = useAuth();

  return (
    <>
      <section className="relative overflow-hidden bg-brand-red-soft">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-red/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-brand-green/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
          <div>
            <p className="text-sm font-semibold text-brand-red">집서비스</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-ink sm:text-4xl lg:text-5xl">
              이사부터 생활까지,
              <br />
              <span className="text-brand-red">집의 모든 순간</span>을 한 번에
            </h1>
            <p className="mt-5 max-w-md break-keep text-base leading-relaxed text-ink/70">
              이사·이사청소·생활청소는 물론, 내 집 평형과 스타일에 맞는 가전·가구 추천, 인터넷·TV·
              정수기 같은 생활 구독까지 — 집팔고360 회원이면 더 저렴한 회원가로 이용할 수 있어요.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/zipservice/new" className={`${primaryButtonClass} w-fit px-8`}>
                무료 견적 받기
              </Link>
              <Link href="/zipservice/companies" className={`${secondaryButtonClass} w-fit px-8`}>
                업체 둘러보고 선택하기
              </Link>
            </div>
            {!isLoading && !user && (
              <Link href="/register" className="mt-3 inline-block text-sm font-medium text-brand-red underline underline-offset-2">
                회원가 확인하려면 가입하기
              </Link>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
              <span>✓ 신청·상담 무료</span>
              <span>✓ 업체 프로필 비교 후 선택 가능</span>
              <span>✓ 회원가 자동 적용</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="rounded-3xl border border-line bg-white p-6 shadow-brand">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">이사 견적 예시</p>
                <span className="rounded-full bg-brand-green-soft px-2.5 py-1 text-[11px] font-bold text-brand-green">
                  회원가 12% ↓
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-soft px-4 py-3">
                  <span className="text-sm text-muted">일반가</span>
                  <span className="text-sm font-semibold text-ink/60 line-through">78만원</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-brand-green-soft px-4 py-3">
                  <span className="text-sm font-semibold text-brand-green">회원가</span>
                  <span className="text-lg font-extrabold text-brand-green">68만원</span>
                </div>
              </div>

              <p className="mt-4 text-center text-xs text-muted">
                * 참고용 평균 시세예요. 실제 견적은 신청 후 안내드려요.
              </p>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 shadow-brand">
              <p className="text-[11px] text-muted">누적 카테고리</p>
              <p className="text-sm font-bold text-ink">이사·청소·가전·가구·구독</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="rounded-2xl border border-line bg-white p-5">
              <p className="font-semibold text-ink">{item.title}</p>
              <p className="mt-2 break-keep text-sm leading-relaxed text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <MemberBenefitSection />
      <CategoryGrid />
      <FeaturedCompanies />

      <section className="bg-soft">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="text-sm font-semibold text-brand-red">HOW IT WORKS</p>
          <h2 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">집서비스는 이렇게 진행돼요</h2>

          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS_STEPS.map((step) => (
              <li key={step.n} className="rounded-2xl border border-line bg-white p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-red text-sm font-bold text-white">
                  {step.n}
                </span>
                <p className="mt-4 font-semibold text-ink">{step.title}</p>
                <p className="mt-1.5 break-keep text-sm leading-relaxed text-muted">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ZipServiceFaq />

      <section className="mx-auto max-w-6xl px-5 pb-16 sm:pb-20">
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-brand-red px-6 py-12 text-center text-white sm:py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">지금 무료로 견적을 받아보세요</h2>
          <p className="max-w-md break-keep text-sm text-white/80">
            1분이면 신청 완료, 집팔고360 회원이면 회원가로 더 저렴하게 이용할 수 있어요.
          </p>
          <Link
            href="/zipservice/new"
            className="mt-2 rounded-full bg-white px-8 py-3 text-sm font-semibold text-brand-red transition hover:bg-white/90"
          >
            무료 견적 받기
          </Link>
        </div>
      </section>

      <div className="pb-16 md:hidden" />
      <MobileStickyCta />
    </>
  );
}
