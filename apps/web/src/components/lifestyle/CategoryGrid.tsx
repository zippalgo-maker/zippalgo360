import Link from "next/link";
import { CATEGORY_LIST, formatPriceRange } from "@/lib/lifestyle-data";
import CategoryIcon from "@/components/lifestyle/CategoryIcon";

export default function CategoryGrid() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
      <p className="text-sm font-semibold text-brand-red">CATEGORY</p>
      <h2 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">어떤 서비스가 필요하세요?</h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
        카테고리를 고르면 1분 만에 맞춤 견적을 신청할 수 있어요.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORY_LIST.map((c) => (
          <Link
            key={c.value}
            href={`/zipservice/new?category=${c.value}`}
            className="group flex flex-col rounded-2xl border border-line bg-white p-6 transition hover:-translate-y-1 hover:border-brand-red hover:shadow-brand"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-red-soft text-brand-red transition group-hover:bg-brand-red group-hover:text-white">
              <CategoryIcon name={c.value} />
            </span>
            <p className="mt-4 text-lg font-bold text-ink">{c.label}</p>
            <p className="mt-1 break-keep text-sm text-muted">{c.shortDesc}</p>

            <div className="mt-5 flex-1" />

            {c.priceRange && (
              <p className="text-xs text-muted">
                평균 <span className="font-semibold text-ink/80">{formatPriceRange(c.priceRange)}</span>
              </p>
            )}
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-red">
              무료 견적 받기
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition group-hover:translate-x-0.5">
                <path
                  fillRule="evenodd"
                  d="M7.3 4.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4L11.6 10 7.3 5.7a1 1 0 0 1 0-1.4z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
