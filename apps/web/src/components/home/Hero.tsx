"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const VIEW_PRICE_OPTIONS = [10000, 30000, 50000, 100000];
const ASSUMED_AGENT_VIEWS = 12;

function formatManwon(amount: number) {
  return `${Math.round(amount / 10000).toLocaleString()}만원`;
}

export default function Hero() {
  const [selectedPrice, setSelectedPrice] = useState(30000);
  const [result, setResult] = useState<number | null>(null);

  return (
    <section className="relative isolate overflow-hidden bg-white">
      <div className="absolute inset-y-0 left-[24%] right-0 z-0 sm:left-[27%]">
        <Image
          src="/images/hero-main.png"
          alt="한강이 보이는 아파트 거실"
          fill
          priority
          sizes="76vw"
          className="object-cover object-[58%_center] saturate-[.92] brightness-[1.04]"
        />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 z-[1] bg-[linear-gradient(90deg,#fff_0%,#fff_26%,rgba(255,255,255,.95)_30%,rgba(255,255,255,.58)_36%,rgba(255,255,255,.16)_42%,rgba(255,255,255,0)_48%)]"
      />

      <div className="relative mx-auto min-h-[560px] max-w-[1600px] px-5 py-10 sm:px-10">
        <div className="relative z-[5] max-w-lg pt-2 sm:pt-6">
          <span className="inline-flex rounded-full bg-brand-red-soft px-4 py-2 text-sm font-bold text-brand-red">
            매도인 수익 플랫폼
          </span>

          <h1 className="mt-5 text-4xl font-black leading-[1.2] tracking-tight text-ink sm:text-5xl">
            집을 팔면서,
            <br />
            현금수익까지.
          </h1>

          <p className="mt-4 text-base leading-relaxed text-ink/70 sm:text-lg">
            매물을 한 번 등록하면 여러 중개사와 연결되고,
            <br className="hidden sm:block" />
            중개사가 열람한 만큼 수익이 쌓입니다.
            <br className="hidden sm:block" />
            계약 완료 후 서류 확인·정산 신청을 거쳐 현금으로 지급받으세요.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              href="/zippalgo/new"
              className="inline-flex h-14 items-center gap-2.5 rounded-lg border border-brand-red bg-gradient-to-b from-[#d70a1f] to-[#c00016] px-8 text-lg font-extrabold text-white shadow-[0_4px_10px_rgba(198,0,23,.17)] transition hover:brightness-105"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 stroke-white stroke-[1.8]" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="9" width="18" height="12" rx="1.5" />
                <path d="M2.5 9h19v-4h-19zM12 5v16" />
                <path d="M12 5c-1.8 0-5.2-.2-5.2-2.4 0-1.1.9-1.9 2-1.9 1.8 0 3.2 2.1 3.2 4.3ZM12 5c1.8 0 5.2-.2 5.2-2.4 0-1.1-.9-1.9-2-1.9-1.8 0-3.2 2.1-3.2 4.3Z" />
              </svg>
              매물 등록하고 현금받기
            </Link>
            <Link
              href="/zippalgo"
              className="inline-flex h-14 min-w-[180px] items-center justify-center rounded-lg border-[1.5px] border-brand-red px-6 text-lg font-extrabold text-brand-red"
            >
              집팔고 자세히 보기
            </Link>
          </div>

          <p className="mt-3 text-sm text-muted">계약 완료 후 서류 확인·정산 신청 시 지급</p>

          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { label: "등록비 0원" },
              { label: "여러 중개사 동시 연결" },
              { label: "내 매물 수익 한눈에" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex h-12 items-center rounded-lg border border-line bg-white/95 px-4 text-sm font-semibold shadow-sm"
              >
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <aside className="relative z-[6] mt-8 w-full max-w-sm rounded-2xl bg-white/97 shadow-[0_7px_24px_rgba(0,0,0,.16)] sm:absolute sm:right-[6%] sm:top-7 sm:mt-0">
          <h2 className="flex h-14 items-center border-b border-line px-6 text-lg font-bold text-ink">
            내 매물 예상 수익
          </h2>
          <div className="px-6 py-5">
            <p className="text-base font-extrabold text-ink">예시: 84m² 아파트</p>
            <p className="mt-1 text-sm text-muted">예상 중개사 열람 {ASSUMED_AGENT_VIEWS}곳 (예시 기준)</p>

            <p className="mt-4 text-sm text-ink">열람 1회 수익 선택</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {VIEW_PRICE_OPTIONS.map((price) => (
                <button
                  key={price}
                  type="button"
                  onClick={() => {
                    setSelectedPrice(price);
                    setResult(null);
                  }}
                  className={`h-10 rounded-lg border text-sm font-bold transition ${
                    selectedPrice === price
                      ? "border-brand-red bg-gradient-to-b from-[#df1024] to-[#c70018] text-white shadow-sm"
                      : "border-line text-ink"
                  }`}
                >
                  {formatManwon(price)}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setResult(selectedPrice * ASSUMED_AGENT_VIEWS)}
              className="mt-3 h-12 w-full rounded-lg bg-gradient-to-b from-[#d70b20] to-[#c00017] text-base font-extrabold text-white"
            >
              내 수익 계산해보기
            </button>

            <div className="mt-3 border-t border-line pt-3">
              <span className="block text-sm font-semibold text-muted">예상 누적수익</span>
              <strong className="mt-1 block text-center text-4xl font-black tracking-tight text-brand-red">
                {result !== null ? formatManwon(result) : "-"}
              </strong>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
