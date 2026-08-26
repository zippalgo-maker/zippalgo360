"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ZipteriorPortfolioDetailOut } from "@/lib/types";

interface InteriorPortfolioPanelProps {
  portfolioId: number;
  onClose: () => void;
}

export default function InteriorPortfolioPanel({ portfolioId, onClose }: InteriorPortfolioPanelProps) {
  const [portfolio, setPortfolio] = useState<ZipteriorPortfolioDetailOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setPortfolio(null);
    apiFetch<ZipteriorPortfolioDetailOut>(`/integrations/zipterior/portfolios/${portfolioId}`)
      .then((detail) => {
        if (!cancelled) setPortfolio(detail);
      })
      .catch(() => {
        if (!cancelled) setPortfolio(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [portfolioId]);

  return (
    <div className="absolute right-0 top-0 z-30 flex h-full w-full max-w-md flex-col overflow-hidden border-l border-line bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <p className="text-sm font-bold text-ink">시공사례 상세</p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-muted transition hover:bg-soft hover:text-ink"
          aria-label="닫기"
        >
          ×
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted">불러오는 중...</div>
      ) : !portfolio || !portfolio.available ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted">
          시공사례 정보를 불러오지 못했습니다.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {portfolio.hero_image && (
            <div className="h-56 w-full bg-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={portfolio.hero_image} alt={portfolio.title} className="h-full w-full object-cover" />
            </div>
          )}

          <div className="px-5 py-4">
            <div className="flex items-center gap-2">
              {portfolio.company_logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={portfolio.company_logo}
                  alt={portfolio.company_name}
                  className="h-8 w-8 rounded-full border border-line object-cover"
                />
              )}
              <div>
                <p className="text-sm font-bold text-brand-green">{portfolio.company_name}</p>
                <p className="text-xs text-muted">{portfolio.complex_name}</p>
              </div>
            </div>

            <h2 className="mt-3 text-base font-extrabold text-ink">{portfolio.title || portfolio.scope}</h2>
            {portfolio.intro && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/80">{portfolio.intro}</p>}

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-soft px-3 py-2.5">
                <p className="text-[11px] text-muted">평형 · 타입</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">
                  {portfolio.area}평 · {portfolio.type || "-"}
                </p>
              </div>
              <div className="rounded-xl bg-soft px-3 py-2.5">
                <p className="text-[11px] text-muted">시공범위</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">{portfolio.scope}</p>
              </div>
              <div className="rounded-xl bg-soft px-3 py-2.5">
                <p className="text-[11px] text-muted">예산</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">{portfolio.budget}</p>
              </div>
              <div className="rounded-xl bg-soft px-3 py-2.5">
                <p className="text-[11px] text-muted">공사 기간</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">{portfolio.duration}</p>
              </div>
            </div>

            {portfolio.company_phone && (
              <a
                href={`tel:${portfolio.company_phone}`}
                className="mt-4 flex w-full items-center justify-center rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {portfolio.company_name}에 문의하기
              </a>
            )}
          </div>

          {portfolio.images.length > 0 && (
            <div className="border-t border-line px-5 py-4">
              <p className="mb-3 text-xs font-semibold text-muted">시공 사진 {portfolio.images.length}장</p>
              <div className="grid grid-cols-2 gap-2.5">
                {portfolio.images.map((image, index) => (
                  <figure key={index} className="overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.src} alt={image.caption ?? portfolio.title} className="h-32 w-full object-cover" />
                    {image.caption && <figcaption className="mt-1 text-[10px] text-muted">{image.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
