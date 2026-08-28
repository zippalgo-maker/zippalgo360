"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ZipteriorPortfolioCard, ZipteriorPortfolioSummary } from "@/lib/types";

type FeedTab = "nearby" | "latest";

interface NearbyPortfolioWidgetProps {
  onOpenPortfolio: (summary: ZipteriorPortfolioSummary) => void;
}

const FEED_LIMIT = 5;

function distanceLabel(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

function dateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" });
}

// InteriorPortfolioPanel은 portfolioId만 실제로 쓰지만(상세를 API에서
// 다시 불러옴), setSelectedPortfolio의 타입(ZipteriorPortfolioSummary)을
// 맞추기 위해 카드에서 아는 정보만으로 최소한의 형태를 채워 넣는다.
function toSummary(card: ZipteriorPortfolioCard): ZipteriorPortfolioSummary {
  return {
    id: card.id,
    company_id: card.company.id,
    company_name: card.company.name,
    complex_name: card.complex_name ?? "",
    title: card.title,
    scope: "",
    budget: "",
    duration: "",
    date: card.published_at,
    area: card.pyeong_label ?? "",
    type: card.apartment_type_name ?? "",
    image: card.thumbnail_url,
  };
}

/**
 * 집테리어 자체 지도 화면(PC "내 주변 시공사례" 위젯, 모바일 "우리집과
 * 가까운/최근 등록 시공사례" 탭)과 동일한 구성 — /map 페이지의 인테리어
 * 모드에서만 우측 하단에 뜬다.
 */
export default function NearbyPortfolioWidget({ onOpenPortfolio }: NearbyPortfolioWidgetProps) {
  const [tab, setTab] = useState<FeedTab>("nearby");
  const [items, setItems] = useState<ZipteriorPortfolioCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }
    // 집테리어와 동일하게 조용히 한 번만 시도하고, 거부돼도 토스트 없이
    // "가까운" 탭에 안내 문구만 보여준다.
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => setLocationDenied(true),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    if (tab === "nearby" && !location) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    const params = new URLSearchParams({ sort: tab === "nearby" ? "nearest" : "latest", limit: String(FEED_LIMIT) });
    if (tab === "nearby" && location) {
      params.set("near_lat", String(location.lat));
      params.set("near_lng", String(location.lng));
    }
    apiFetch<{ items: ZipteriorPortfolioCard[]; available: boolean }>(`/integrations/zipterior/portfolios/feed?${params}`)
      .then((data) => {
        if (!cancelled) setItems(data.available ? data.items : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, location]);

  if (closed) return null;

  return (
    <div className="absolute bottom-4 right-4 z-20 w-72 overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setTab("nearby")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              tab === "nearby" ? "bg-brand-green/15 text-brand-green" : "text-muted hover:bg-soft"
            }`}
          >
            우리집과 가까운
          </button>
          <button
            type="button"
            onClick={() => setTab("latest")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              tab === "latest" ? "bg-brand-green/15 text-brand-green" : "text-muted hover:bg-soft"
            }`}
          >
            최근 등록
          </button>
        </div>
        <button
          type="button"
          onClick={() => setClosed(true)}
          aria-label="닫기"
          className="flex h-6 w-6 items-center justify-center rounded-full text-sm text-muted hover:bg-soft hover:text-ink"
        >
          ×
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {tab === "nearby" && !location ? (
          <p className="px-3 py-6 text-center text-[11px] leading-relaxed text-muted">
            {locationDenied
              ? "위치 권한을 허용하면\n우리집과 가까운 시공사례를 보여드려요"
              : "위치 확인 중..."}
          </p>
        ) : isLoading ? (
          <p className="px-3 py-6 text-center text-[11px] text-muted">불러오는 중...</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-6 text-center text-[11px] text-muted">아직 등록된 시공사례가 없어요</p>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpenPortfolio(toSummary(item))}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-soft"
                >
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-soft">
                    {item.thumbnail_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ink">{item.complex_name || item.title}</p>
                    <p className="truncate text-[10px] text-muted">
                      {item.company.name}
                      {item.pyeong_label ? ` · ${item.pyeong_label}평` : ""}
                    </p>
                    <p className="text-[10px] text-brand-green">
                      {tab === "nearby" && item.distance_km != null ? distanceLabel(item.distance_km) : dateLabel(item.published_at)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
