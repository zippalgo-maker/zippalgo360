"use client";

import { useState } from "react";
import { FAQ_ITEMS } from "@/lib/lifestyle-data";

export default function ZipServiceFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
      <p className="text-sm font-semibold text-brand-red">FAQ</p>
      <h2 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">자주 묻는 질문</h2>

      <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-white">
        {FAQ_ITEMS.map((item, i) => {
          const open = openIndex === i;
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                aria-expanded={open}
              >
                <span className="text-sm font-semibold text-ink sm:text-base">{item.q}</span>
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
                >
                  <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {open && (
                <p className="break-keep px-5 pb-4 text-sm leading-relaxed text-muted">{item.a}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
