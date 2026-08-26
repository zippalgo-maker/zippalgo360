"use client";

import { useState } from "react";
import SectionHeading from "@/components/lifestyle/SectionHeading";
import ScrollRow from "@/components/lifestyle/ScrollRow";
import PhotoCard from "@/components/lifestyle/PhotoCard";
import { TRENDING_CARDS, TRENDING_FILTERS } from "@/lib/mock-content";

export default function TrendingTipsSection() {
  const [filter, setFilter] = useState(TRENDING_FILTERS[0]);
  const cards = TRENDING_CARDS[filter];

  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <SectionHeading eyebrow="지금 많이 보는" title="집서비스 고민 해결법" />

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TRENDING_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              filter === f ? "border-brand-red bg-brand-red text-white" : "border-line text-ink/70 hover:border-brand-red"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <ScrollRow itemWidth={176}>
          {cards.map((card) => (
            <div key={card.title} className="w-44 shrink-0">
              <PhotoCard {...card} />
            </div>
          ))}
        </ScrollRow>
      </div>
    </section>
  );
}
