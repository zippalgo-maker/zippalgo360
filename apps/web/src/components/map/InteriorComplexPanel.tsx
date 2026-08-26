"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type {
  ZipteriorComplexDetailOut,
  ZipteriorComplexPortfolioListOut,
  ZipteriorPortfolioSummary,
} from "@/lib/types";

interface InteriorComplexPanelProps {
  complexId: number;
  selectedArea: string | null;
  onSelectArea: (area: string | null) => void;
  onClose: () => void;
  onOpenPortfolio: (portfolio: ZipteriorPortfolioSummary) => void;
}

const BASIC_INFO_KEYS: Array<{ key: keyof ZipteriorComplexDetailOut; label: string }> = [
  { key: "year", label: "입주 시기" },
  { key: "households", label: "세대수" },
  { key: "buildings", label: "동수" },
  { key: "parking", label: "주차대수" },
  { key: "heating", label: "난방" },
  { key: "builder", label: "시공사" },
];

export default function InteriorComplexPanel({
  complexId,
  selectedArea,
  onSelectArea,
  onClose,
  onOpenPortfolio,
}: InteriorComplexPanelProps) {
  const [complex, setComplex] = useState<ZipteriorComplexDetailOut | null>(null);
  const [portfolios, setPortfolios] = useState<ZipteriorPortfolioSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setComplex(null);
    setPortfolios([]);
    setHeroIndex(0);
    Promise.all([
      apiFetch<ZipteriorComplexDetailOut>(`/integrations/zipterior/complexes/${complexId}`),
      apiFetch<ZipteriorComplexPortfolioListOut>(
        `/integrations/zipterior/complex-portfolios?complex_id=${complexId}&limit=100`
      ),
    ])
      .then(([complexDetail, portfolioList]) => {
        if (cancelled) return;
        setComplex(complexDetail);
        setPortfolios(portfolioList.items);
        if (complexDetail.apartment_types.length && !selectedArea) {
          const first = complexDetail.apartment_types[0];
          onSelectArea(`${first.area}|${first.type}`);
        }
      })
      .catch(() => {
        if (!cancelled) setComplex(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complexId]);

  const filteredPortfolios = (
    !selectedArea || selectedArea === "all"
      ? portfolios
      : portfolios.filter((p) => `${p.area}|${p.type}` === selectedArea)
  )
    // 집테리어 지도의 기본 정렬(최신순)과 동일하게 맞춘다.
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="absolute right-0 top-0 z-20 flex h-full w-full max-w-md flex-col overflow-hidden border-l border-line bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <p className="text-sm font-bold text-ink">단지 정보</p>
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
      ) : !complex || !complex.available ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted">
          단지 정보를 불러오지 못했습니다.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {complex.images.length > 0 && (
            <div className="relative h-48 w-full bg-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={complex.images[heroIndex]}
                alt={`${complex.name} 단지 이미지`}
                className="h-full w-full object-cover"
              />
              {complex.images.length > 1 && (
                <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
                  {complex.images.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setHeroIndex(index)}
                      className={`h-1.5 w-1.5 rounded-full ${index === heroIndex ? "bg-white" : "bg-white/50"}`}
                      aria-label={`이미지 ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="px-5 py-4">
            <h2 className="text-lg font-extrabold text-ink">{complex.name}</h2>
            <p className="mt-1 text-sm text-muted">{complex.address}</p>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {BASIC_INFO_KEYS.map(({ key, label }) => (
                <div key={key} className="rounded-xl bg-soft px-3 py-2.5">
                  <p className="text-[11px] text-muted">{label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink">{String(complex[key])}</p>
                </div>
              ))}
            </div>
          </div>

          {complex.apartment_types.length > 0 && (
            <div className="border-t border-line px-5 py-4">
              <p className="mb-2 text-xs font-semibold text-muted">평형 타입</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onSelectArea("all")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    !selectedArea || selectedArea === "all"
                      ? "border-brand-green bg-brand-green text-white"
                      : "border-line text-ink/70 hover:border-brand-green"
                  }`}
                >
                  전체
                </button>
                {complex.apartment_types.map((type) => {
                  const key = `${type.area}|${type.type}`;
                  const active = selectedArea === key;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => onSelectArea(key)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-brand-green bg-brand-green text-white"
                          : "border-line text-ink/70 hover:border-brand-green"
                      }`}
                    >
                      {type.area}
                      {type.type === "A" ? "" : type.type}평 · {type.count}건
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t border-line px-5 py-4">
            <p className="mb-3 text-xs font-semibold text-muted">
              시공사례 {filteredPortfolios.length}건
            </p>
            {filteredPortfolios.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-xs text-muted">
                조건에 맞는 시공사례가 없습니다.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredPortfolios.map((portfolio) => (
                  <button
                    key={portfolio.id}
                    type="button"
                    onClick={() => onOpenPortfolio(portfolio)}
                    className="overflow-hidden rounded-xl border border-line text-left transition hover:border-brand-green hover:shadow-md"
                  >
                    <div className="h-24 w-full bg-soft">
                      {portfolio.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={portfolio.image} alt={portfolio.title} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-[11px] font-semibold text-brand-green">{portfolio.company_name}</p>
                      <p className="mt-0.5 truncate text-xs font-medium text-ink">{portfolio.title || portfolio.scope}</p>
                      <p className="mt-1 text-[10px] text-muted">
                        {portfolio.area}평 · {portfolio.type}타입 · {portfolio.date}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
