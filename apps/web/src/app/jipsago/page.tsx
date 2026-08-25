"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

const STEPS = [
  { n: "1", title: "조건 의뢰", desc: "원하는 지역·평형·예산 등 조건을 등록합니다." },
  { n: "2", title: "중개사 자동 배정", desc: "해당 지역 회원 공인중개사에게 순서대로 공유됩니다." },
  { n: "3", title: "중개사 응답", desc: "배정받은 중개사가 의뢰를 확인하고 수락 여부를 결정합니다." },
  { n: "4", title: "매칭 & 상담", desc: "수락한 중개사와 연결되어 상담과 매물 추천을 받습니다." },
];

export default function JipsagoPage() {
  const { user, isLoading } = useAuth();

  return (
    <>
      <section className="bg-brand-green-soft">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-sm font-semibold text-brand-red">집사고</p>
          <h1 className="mt-3 max-w-xl text-3xl font-extrabold text-brand-green sm:text-4xl">
            원하는 조건을 의뢰하면, 중개사가 찾아드립니다
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink/70">
            집을 사고 싶은 조건(지역·평형·예산)을 의뢰하면 집팔고360에 가입된 회원 공인중개사에게
            공유되어 원하는 집을 찾는 것을 돕습니다.
          </p>

          {!isLoading && (
            <div className={`${cardClass} mt-8 max-w-md`}>
              {!user && (
                <>
                  <p className="text-sm font-semibold text-ink">시작하려면 회원가입이 필요해요</p>
                  <div className="mt-4 flex gap-2">
                    <Link href="/register" className={primaryButtonClass}>
                      일반회원 가입
                    </Link>
                    <Link href="/register?type=company" className={secondaryButtonClass}>
                      공인중개사 가입
                    </Link>
                  </div>
                </>
              )}
              {user?.role === "customer" && (
                <>
                  <p className="text-sm font-semibold text-ink">원하는 조건을 의뢰해보세요</p>
                  <div className="mt-4 flex gap-2">
                    <Link href="/jipsago/new" className={primaryButtonClass}>
                      구매의뢰 등록하기
                    </Link>
                    <Link href="/jipsago/mine" className={secondaryButtonClass}>
                      내 구매의뢰 보기
                    </Link>
                  </div>
                </>
              )}
              {user?.role === "company" && (
                <>
                  <p className="text-sm font-semibold text-ink">배정된 의뢰를 확인해보세요</p>
                  <div className="mt-4 flex gap-2">
                    <Link href="/jipsago/assignments" className={primaryButtonClass}>
                      배정된 의뢰 보기
                    </Link>
                    <Link href="/onboarding/company" className={secondaryButtonClass}>
                      업체 정보 등록
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="text-sm font-semibold text-brand-green">HOW IT WORKS</p>
        <h2 className="mt-3 text-3xl font-bold text-ink">집사고는 이렇게 진행돼요</h2>

        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <li key={step.n} className="rounded-2xl border border-line bg-white p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">
                {step.n}
              </span>
              <p className="mt-4 font-semibold text-ink">{step.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
