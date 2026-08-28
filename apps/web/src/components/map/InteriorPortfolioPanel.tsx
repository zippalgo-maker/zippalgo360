"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ContentBlockView, groupImagesBySpace } from "@/lib/content-blocks";
import { formatAreaLabel, type AreaUnit } from "@/lib/interior-marker";
import type { ZipteriorPortfolioDetailOut, ZipteriorPortfolioDisplaySettingsOut } from "@/lib/types";

interface InteriorPortfolioPanelProps {
  portfolioId: number;
  onClose: () => void;
  areaUnit: AreaUnit;
}

export default function InteriorPortfolioPanel({ portfolioId, onClose, areaUnit }: InteriorPortfolioPanelProps) {
  const [portfolio, setPortfolio] = useState<ZipteriorPortfolioDetailOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [displaySettings, setDisplaySettings] = useState<ZipteriorPortfolioDisplaySettingsOut | null>(null);

  // 관리자가 설정하는 전역 안내문구/이미지/견적문의 CTA — 특정 포트폴리오에
  // 딸린 값이 아니라 집테리어 전체 공통 설정이라 portfolioId와 무관하게
  // 한 번만 불러온다. 실패해도 조용히 무시(안내 블록을 그냥 안 보여줌).
  useEffect(() => {
    let cancelled = false;
    apiFetch<ZipteriorPortfolioDisplaySettingsOut>("/integrations/zipterior/portfolio-display-settings")
      .then((settings) => {
        if (!cancelled) setDisplaySettings(settings);
      })
      .catch(() => {
        if (!cancelled) setDisplaySettings(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    <div className="flex h-full w-[28rem] flex-shrink-0 flex-col overflow-hidden border-r border-line bg-white shadow-2xl">
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
                  {formatAreaLabel(portfolio.area, areaUnit)} · {portfolio.type || "-"}
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

          {portfolio.content_blocks.length > 0 ? (
            // 오늘의집 원본 순서 데이터가 있는 포트폴리오 — 집테리어와 동일하게
            // 텍스트·사진·구분선을 작성자가 정한 순서 그대로 보여준다.
            <div className="border-t border-line px-5 py-4">
              <div className="flex flex-col gap-4">
                {(() => {
                  let imageIndex = 0;
                  return portfolio.content_blocks.map((block, index) => {
                    const isImage = block.block_type?.toLowerCase() === "image";
                    const node = <ContentBlockView key={index} block={block} imageIndex={imageIndex} />;
                    if (isImage) imageIndex += 1;
                    return node;
                  });
                })()}
              </div>
            </div>
          ) : (
            (() => {
              const rooms = groupImagesBySpace(portfolio.images, portfolio.spaces);
              if (rooms.length > 0) {
                // 방(공간)별로 이름·설명과 함께 묶어서 보여준다 — 집테리어
                // 포트폴리오 상세의 기본 표시 방식과 동일.
                return (
                  <div className="border-t border-line px-5 py-4">
                    <div className="flex flex-col gap-5">
                      {rooms.map((room) => (
                        <section key={room.key}>
                          <h3 className="text-sm font-bold text-ink">{room.name}</h3>
                          {room.description && (
                            <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-muted">{room.description}</p>
                          )}
                          <div className="mt-3 grid grid-cols-2 gap-2.5">
                            {room.images.map((image, index) => (
                              <figure key={index} className="overflow-hidden rounded-xl">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={image.src} alt={image.caption ?? room.name} className="h-32 w-full object-cover" />
                                {image.caption && <figcaption className="mt-1 whitespace-pre-line text-[10px] text-muted">{image.caption}</figcaption>}
                              </figure>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
                );
              }
              if (portfolio.images.length === 0) return null;
              // 방/공간 정보가 전혀 없는 포트폴리오를 위한 안전장치 — 기존
              // 평면 그리드로 폴백.
              return (
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
              );
            })()
          )}

          {displaySettings?.notice_enabled && (
            <div className="border-t border-line px-5 py-4 text-center">
              {displaySettings.notice_image_path && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displaySettings.notice_image_path} alt="" className="mx-auto mb-3 w-full rounded-xl" />
              )}
              {displaySettings.notice_text && (
                <p className="mb-3 whitespace-pre-line text-xs leading-relaxed text-ink/80">{displaySettings.notice_text}</p>
              )}
              {portfolio.company_phone && (
                <a
                  href={`tel:${portfolio.company_phone}`}
                  className="flex w-full items-center justify-center rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  {displaySettings.notice_button_label || "이 포트폴리오의 집 인테리어 견적 문의하기"}
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
