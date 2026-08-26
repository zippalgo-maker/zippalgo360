"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CATEGORY_LIST, type ServiceCategory } from "@/lib/lifestyle-data";
import { getMockCompaniesByCategory } from "@/lib/mock-companies";
import ProCard from "@/components/lifestyle/ProCard";

function isValidCategory(value: string | null): value is ServiceCategory {
  return CATEGORY_LIST.some((c) => c.value === value);
}

function CompanyBrowse() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("category");
  const [category, setCategory] = useState<ServiceCategory | "all">(
    isValidCategory(initial) ? initial : "all"
  );

  const companies = getMockCompaniesByCategory(category === "all" ? null : category);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <p className="text-sm font-semibold text-brand-red">업체 둘러보기</p>
      <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
        홍보 내용을 보고 마음에 드는 업체를 직접 골라보세요
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        업체 소개, 후기, 응답률을 비교해보고 원하는 업체에 바로 견적을 요청할 수 있어요. 물론
        어떤 업체가 좋을지 모르겠다면 카테고리만 골라 전체 업체에게 견적을 받을 수도 있어요.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            category === "all" ? "border-brand-red bg-brand-red text-white" : "border-line text-ink/70 hover:border-brand-red"
          }`}
        >
          전체
        </button>
        {CATEGORY_LIST.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategory(c.value)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              category === c.value ? "border-brand-red bg-brand-red text-white" : "border-line text-ink/70 hover:border-brand-red"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {companies.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <ProCard key={company.id} company={company} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-soft p-10 text-center">
          <p className="font-semibold text-ink">아직 준비 중인 카테고리예요</p>
          <p className="mt-1 text-sm text-muted">
            대신 이 카테고리로 바로 견적을 요청해보시면 제휴 업체가 순차적으로 입점하는 대로
            안내드릴게요.
          </p>
          {category !== "all" && (
            <Link
              href={`/zipservice/new?category=${category}`}
              className="mt-4 inline-block rounded-full bg-brand-red px-6 py-2.5 text-sm font-semibold text-white"
            >
              무료 견적 받기
            </Link>
          )}
        </div>
      )}

      <p className="mt-8 text-xs leading-relaxed text-muted">
        * 위 업체 프로필은 디자인 검토를 위한 예시이며, 실제 입점 업체 정보가 아니에요. 실제
        업체가 입점하면 순차적으로 교체될 예정이에요.
      </p>
    </div>
  );
}

export default function ZipServiceCompaniesPage() {
  return (
    <Suspense>
      <CompanyBrowse />
    </Suspense>
  );
}
