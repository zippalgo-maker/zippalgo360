"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import CategoryIcon from "@/components/lifestyle/CategoryIcon";
import { CATEGORY_ACCENT, CATEGORY_LIST } from "@/lib/lifestyle-data";

const REGIONS = ["서울 강남구", "서울 마포구", "서울 송파구", "경기 성남시", "인천 전체", "전국"];

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 text-muted">
      <circle cx="9" cy="9" r="6" />
      <path d="M17 17l-4-4" strokeLinecap="round" />
    </svg>
  );
}

export default function ServiceHeroSearch() {
  const router = useRouter();
  const [region, setRegion] = useState(REGIONS[0]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"compare" | "instant">("compare");

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/zipservice/companies?q=${encodeURIComponent(q)}` : "/zipservice/companies");
  }

  return (
    <section className="border-b border-line bg-white">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="flex flex-wrap items-center gap-2 text-2xl font-extrabold text-ink sm:text-3xl">
          <label className="relative inline-flex items-center">
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="cursor-pointer appearance-none rounded-lg bg-transparent pr-6 font-extrabold text-brand-red focus:outline-none"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <svg viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-0 h-4 w-4 text-brand-red">
              <path fillRule="evenodd" d="M5.2 7.5a1 1 0 0 1 1.4 0L10 10.9l3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L5.2 8.9a1 1 0 0 1 0-1.4z" clipRule="evenodd" />
            </svg>
          </label>
          <span>에서 어떤 서비스가 필요하세요?</span>
        </div>

        <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-line bg-soft px-5 py-3.5">
            <SearchIcon />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="어떤 서비스가 필요하세요?"
              className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => router.push("/zipservice/new")}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand-red px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-red-dark"
          >
            ✨ AI 맞춤 견적 요청
          </button>
        </form>

        <div className="mt-6 flex items-center gap-6 border-b border-line text-sm font-semibold">
          <button
            type="button"
            onClick={() => setTab("compare")}
            className={`border-b-2 pb-3 transition ${tab === "compare" ? "border-brand-red text-brand-red" : "border-transparent text-muted"}`}
          >
            견적비교
          </button>
          <button
            type="button"
            onClick={() => setTab("instant")}
            className="flex items-center gap-1.5 border-b-2 border-transparent pb-3 text-muted"
          >
            바로예약
            <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-bold text-muted">준비중</span>
          </button>
        </div>

        {tab === "instant" ? (
          <p className="mt-8 text-sm text-muted">바로예약은 준비 중이에요. 지금은 견적비교로 요청해주세요.</p>
        ) : (
          <div className="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-6">
            {CATEGORY_LIST.map((c) => (
              <a
                key={c.value}
                href={`/zipservice/new?category=${c.value}`}
                className="flex flex-col items-center gap-2 text-center"
              >
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-white transition group-hover:scale-105"
                  style={{ background: CATEGORY_ACCENT[c.value] }}
                >
                  <span className="h-6 w-6">
                    <CategoryIcon name={c.value} />
                  </span>
                </span>
                <span className="break-keep text-xs font-semibold text-ink">{c.label}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
