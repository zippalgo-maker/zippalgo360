"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ZipteriorPortfolioCard } from "@/lib/types";

type FeedTab = "nearby" | "latest";

interface NearbyPortfolioWidgetProps {
  onOpenPortfolio: (card: ZipteriorPortfolioCard) => void;
  onClose: () => void;
}

// 페이지당 6개(2열×3행) × 3페이지 = 18개. 백엔드 /portfolios/feed의
// limit 상한이 20이라 한 번의 요청으로 다 받아와 클라이언트에서
// 페이지로 나눈다(요청 3번 대신 1번).
const PAGE_SIZE = 6;
const PAGE_COUNT = 3;
const FEED_LIMIT = PAGE_SIZE * PAGE_COUNT;

function chunk<T>(list: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < list.length; i += size) pages.push(list.slice(i, i + size));
  return pages;
}

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
  // 6개씩 페이지로 나눠 가로 스크롤로 넘기고, 하단 점으로 현재 위치를
  // 보여준다(실사용 요청 — 세로 스크롤 없이 총 18개를 3페이지로).
  const [page, setPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  function switchTab(nextTab: FeedTab) {
    setTab(nextTab);
    setPage(0);
    scrollRef.current?.scrollTo({ left: 0 });
  }

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    if (el.clientWidth === 0) return;
    setPage(Math.round(el.scrollLeft / el.clientWidth));
  }

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
  const pages = items ? chunk(items, PAGE_SIZE) : [];

  return (
    <div className="absolute right-full top-0 z-20 mr-2 w-80 overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => switchTab("nearby")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              tab === "nearby" ? "bg-brand-green/15 text-brand-green" : "text-muted hover:bg-soft"
            }`}
          >
            우리집과 가까운
          </button>
          <button
            type="button"
            onClick={() => switchTab("latest")}
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

      <div className="p-2">
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
          <>
            {/* 한 페이지 = 2열×3행(6개), 최대 3페이지(18개)를 가로
                스크롤/스냅으로 넘겨 본다 — 세로로 쭉 나열하면 18개는
                스크롤이 너무 길어지고, 2열만으로는(5~6개) 그래도 살짝
                넘쳤다(실사용 리포트). 페이지 폭을 스크롤 컨테이너
                폭(w-full)과 똑같이 맞춰야 스냅 시 다음 페이지가 딱
                맞게 넘어간다. */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {pages.map((pageItems, pageIndex) => (
                <div key={pageIndex} className="grid h-44 w-full shrink-0 snap-center content-start grid-cols-2 gap-1">
                  {pageItems.map((item) => (
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
              ))}
            </div>

            {pages.length > 1 && (
              <div className="mt-1 flex items-center justify-center gap-2">
                {pages.map((_, pageIndex) => (
                  <span
                    key={pageIndex}
                    className={`rounded-full transition-all ${
                      pageIndex === page ? "h-2 w-2 bg-ink/70" : "h-1.5 w-1.5 bg-line"
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
