"use client";

import { useState } from "react";
import { CATEGORY_LIST, type ServiceCategory } from "@/lib/lifestyle-data";
import { getMockCompaniesByCategory } from "@/lib/mock-companies";
import SectionHeading from "@/components/lifestyle/SectionHeading";
import ScrollRow from "@/components/lifestyle/ScrollRow";
import ProCardCompact from "@/components/lifestyle/ProCardCompact";

export default function RecommendedProsSection() {
  const [category, setCategory] = useState<ServiceCategory | "all">("all");
  const companies = getMockCompaniesByCategory(category === "all" ? null : category);

  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <div className="flex items-center gap-2">
        <SectionHeading eyebrow="오늘의 추천 업체" title="지금 인기 있는 제휴 업체" moreHref="/zipservice/companies" />
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
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
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              category === c.value ? "border-brand-red bg-brand-red text-white" : "border-line text-ink/70 hover:border-brand-red"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <ScrollRow itemWidth={288}>
          {companies.map((company) => (
            <ProCardCompact key={company.id} company={company} />
          ))}
        </ScrollRow>
      </div>
    </section>
  );
}
