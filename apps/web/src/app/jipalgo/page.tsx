"use client";

import Link from "next/link";
import DoubleBenefit from "@/components/home/DoubleBenefit";
import { useAuth } from "@/lib/auth-context";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export default function JipalgoPage() {
  const { user, isLoading } = useAuth();

  return (
    <>
      <section className="bg-brand-green-soft">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-sm font-semibold text-brand-red">집팔고</p>
          <h1 className="mt-3 max-w-xl text-3xl font-extrabold text-brand-green sm:text-4xl">
            매물을 올리면, 팔릴 때 보상받는다
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink/70">
            집을 팔고 싶은 회원이 매물을 등록하면 회원 공인중개사가 건당 결제로 열람하고 중개에
            활용합니다. 매매가 완료되면 결제 금액이 매물 등록 고객에게 지급되는 더블베네핏
            구조입니다.
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
                  <p className="text-sm font-semibold text-ink">매물을 등록해보세요</p>
                  <div className="mt-4 flex gap-2">
                    <Link href="/jipalgo/new" className={primaryButtonClass}>
                      매물 등록하기
                    </Link>
                    <Link href="/jipalgo/mine" className={secondaryButtonClass}>
                      내 매물 보기
                    </Link>
                  </div>
                </>
              )}
              {user?.role === "company" && (
                <>
                  <p className="text-sm font-semibold text-ink">등록된 매물을 열람해보세요</p>
                  <div className="mt-4 flex gap-2">
                    <Link href="/jipalgo/browse" className={primaryButtonClass}>
                      매물 둘러보기
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

      <DoubleBenefit />
    </>
  );
}
