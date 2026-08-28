"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ZipteriorPortfolioCard } from "@/lib/types";

type FeedTab = "nearby" | "latest";

interface NearbyPortfolioWidgetProps {
  onOpenPortfolio: (card: ZipteriorPortfolioCard) => void;
  onClose: () => void;
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

function fetchFeed(params: URLSearchParams): Promise<ZipteriorPortfolioCard[]> {
  return apiFetch<{ items: ZipteriorPortfolioCard[]; available: boolean }>(
    `/integrations/zipterior/portfolios/feed?${params}`,
  )
    .then((data) => (data.available ? data.items : []))
    .catch(() => []);
}

/**
 * 집테리어 자체 지도 화면(PC "내 주변 시공사례" 위젯, 모바일 "우리집과
 * 가까운/최근 등록 시공사례" 탭)과 동일한 구성 — /map 페이지에서는
 * "지도 레이어" 패널과 같은 패턴으로, 우측 상단 "인테리어" 버튼 바로
 * 아래에 드롭다운으로 펼쳐진다(2026-08-28, 사용자 요청으로 항상 떠
 * 있는 하단 위젯에서 버튼-드롭다운 방식으로 변경).
 */
export default function NearbyPortfolioWidget({ onOpenPortfolio, onClose }: NearbyPortfolioWidgetProps) {
  const [tab, setTab] = useState<FeedTab>("nearby");
  // 두 탭 모두 화면에 보이기 전에 미리 받아둔다 — 탭을 누른 시점에야
  // 요청을 시작하면, 아무리 캐시를 잘 짜도 "최초 클릭"만큼은 로딩
  // 문구가 한 번 보였다 사라지는 게 보인다(실사용 리포트: 최초
  // 상태에서 "최근 등록" 처음 눌렀을 때만 깜빡임). "최근 등록"은
  // 위치 정보가 필요 없으니 마운트 즉시, "우리집과 가까운"은 위치를
  // 얻는 즉시 받아서, 사용자가 실제로 탭을 누를 때는 대부분 이미
  // 캐시가 채워져 있게 한다.
  const [feedCache, setFeedCache] = useState<Partial<Record<FeedTab, ZipteriorPortfolioCard[]>>>({});
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

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
    let cancelled = false;
    const params = new URLSearchParams({ sort: "latest", limit: String(FEED_LIMIT) });
    fetchFeed(params).then((items) => {
      if (!cancelled) setFeedCache((prev) => ({ ...prev, latest: items }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    const params = new URLSearchParams({
      sort: "nearest",
      limit: String(FEED_LIMIT),
      near_lat: String(location.lat),
      near_lng: String(location.lng),
    });
    fetchFeed(params).then((items) => {
      if (!cancelled) setFeedCache((prev) => ({ ...prev, nearby: items }));
    });
    return () => {
      cancelled = true;
    };
  }, [location]);

  const items = feedCache[tab];

  return (
    <div className="absolute right-0 top-12 z-20 w-80 overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
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
          onClick={onClose}
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
        ) : items === undefined ? (
          <p className="px-3 py-6 text-center text-[11px] text-muted">불러오는 중...</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-6 text-center text-[11px] text-muted">아직 등록된 시공사례가 없어요</p>
        ) : (
          // 2열로 배치 — 세로로 쭉 나열하면 5개만으로도 max-h를 넘어
          // 스크롤이 생겼다(실사용 리포트). 한 줄에 2개씩 배치해 같은
          // 개수를 절반 높이에 담는다. 카드를 정사각 썸네일 위주로
          // 키우면 오히려 한 줄이 더 두꺼워져 역효과라, 기존 목록과
          // 같은 "작은 썸네일 + 텍스트" 가로 배치를 그대로 2열로만
          // 감싼다.
          <div className="grid grid-cols-2 gap-1 p-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenPortfolio(item)}
                className="flex min-w-0 items-center gap-1.5 rounded-lg p-1.5 text-left transition hover:bg-soft"
              >
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-soft">
                  {item.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold text-ink">{item.complex_name || item.title}</p>
                  <p className="truncate text-[9px] text-muted">
                    {item.company.name}
                    {item.pyeong_label ? ` · ${item.pyeong_label}평` : ""}
                  </p>
                  <p className="text-[9px] text-brand-green">
                    {tab === "nearby" && item.distance_km != null ? distanceLabel(item.distance_km) : dateLabel(item.published_at)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
