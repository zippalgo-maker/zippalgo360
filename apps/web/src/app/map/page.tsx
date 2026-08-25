"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { loadKakaoMaps } from "@/lib/kakao-maps";
import type { ListingMapMarker, ZipteriorMapMarkerListOut } from "@/lib/types";

type MapMode = "listings" | "interior";

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY ?? "";
const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 };

function ServiceMapView() {
  const searchParams = useSearchParams();
  const initialMode: MapMode = searchParams.get("mode") === "interior" ? "interior" : "listings";

  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const infoWindowRef = useRef<any>(null);

  const [mode, setMode] = useState<MapMode>(initialMode);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(false);
  const [markerCount, setMarkerCount] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!KAKAO_APP_KEY) {
      setMapError("카카오맵 API 키가 설정되지 않았습니다.");
      return;
    }
    let cancelled = false;
    loadKakaoMaps(KAKAO_APP_KEY)
      .then(() => {
        if (cancelled || !mapContainerRef.current) return;
        const kakao = window.kakao;
        const map = new kakao.maps.Map(mapContainerRef.current, {
          center: new kakao.maps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng),
          level: 8,
        });
        mapRef.current = map;
        infoWindowRef.current = new kakao.maps.InfoWindow({ removable: true });
        setIsMapReady(true);
      })
      .catch((err) => setMapError(err instanceof Error ? err.message : "카카오맵을 불러오지 못했습니다."));
    return () => {
      cancelled = true;
    };
  }, []);

  const clearMarkers = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    markersRef.current.forEach((marker: any) => marker.setMap(null));
    markersRef.current = [];
  }, []);

  const loadListingMarkers = useCallback(async () => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;
    setIsLoadingMarkers(true);
    setUnavailable(false);
    try {
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const markers = await apiFetch<ListingMapMarker[]>(
        `/listings/map/markers?north=${ne.getLat()}&south=${sw.getLat()}&east=${ne.getLng()}&west=${sw.getLng()}&limit=500`
      );
      clearMarkers();
      markers.forEach((item) => {
        const position = new kakao.maps.LatLng(item.latitude, item.longitude);
        const marker = new kakao.maps.Marker({ position, map });
        kakao.maps.event.addListener(marker, "click", () => {
          infoWindowRef.current.setContent(
            `<div style="padding:10px 12px;min-width:180px;font-size:13px;line-height:1.6;">
              <strong>${item.complex_name}</strong><br/>
              ${item.asking_price.toLocaleString()}원<br/>
              <a href="/jipalgo/listings/${item.id}" style="color:#bb1730;font-weight:600;">매물 상세보기 →</a>
            </div>`
          );
          infoWindowRef.current.open(map, marker);
        });
        markersRef.current.push(marker);
      });
      setMarkerCount(markers.length);
    } finally {
      setIsLoadingMarkers(false);
    }
  }, [clearMarkers]);

  const loadInteriorMarkers = useCallback(async () => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;
    setIsLoadingMarkers(true);
    try {
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const data = await apiFetch<ZipteriorMapMarkerListOut>(
        `/integrations/zipterior/map-markers?north=${ne.getLat()}&south=${sw.getLat()}&east=${ne.getLng()}&west=${sw.getLng()}&limit=500`
      );
      clearMarkers();
      setUnavailable(!data.available);
      data.items.forEach((item) => {
        const position = new kakao.maps.LatLng(item.latitude, item.longitude);
        const marker = new kakao.maps.Marker({ position, map });
        kakao.maps.event.addListener(marker, "click", () => {
          infoWindowRef.current.setContent(
            `<div style="padding:10px 12px;min-width:180px;font-size:13px;line-height:1.6;">
              <strong>${item.name}</strong><br/>
              시공사례 ${item.portfolio_count}건<br/>
              <a href="https://zipterior.kr/?complex_id=${item.id}" target="_blank" rel="noreferrer" style="color:#bb1730;font-weight:600;">집테리어에서 보기 →</a>
            </div>`
          );
          infoWindowRef.current.open(map, marker);
        });
        markersRef.current.push(marker);
      });
      setMarkerCount(data.items.length);
    } finally {
      setIsLoadingMarkers(false);
    }
  }, [clearMarkers]);

  useEffect(() => {
    if (!isMapReady) return;
    const kakao = window.kakao;
    const map = mapRef.current;

    const refresh = () => {
      if (mode === "listings") {
        loadListingMarkers();
      } else {
        loadInteriorMarkers();
      }
    };

    refresh();
    kakao.maps.event.addListener(map, "idle", refresh);
    return () => {
      kakao.maps.event.removeListener(map, "idle", refresh);
    };
  }, [isMapReady, mode, loadListingMarkers, loadInteriorMarkers]);

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <div ref={mapContainerRef} className="h-full w-full bg-soft" />

      <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-2">
        <div className="flex overflow-hidden rounded-full border border-line bg-white shadow-md">
          <button
            type="button"
            onClick={() => setMode("listings")}
            className={`px-4 py-2 text-sm font-semibold transition ${
              mode === "listings" ? "bg-brand-red text-white" : "text-ink/70 hover:text-brand-red"
            }`}
          >
            매물보기
          </button>
          <button
            type="button"
            onClick={() => setMode("interior")}
            className={`px-4 py-2 text-sm font-semibold transition ${
              mode === "interior" ? "bg-brand-red text-white" : "text-ink/70 hover:text-brand-red"
            }`}
          >
            인테리어보기
          </button>
        </div>

        <div className="rounded-xl border border-line bg-white/95 px-3 py-2 text-xs text-muted shadow-md">
          {isLoadingMarkers
            ? "불러오는 중..."
            : mode === "listings"
              ? `매물 ${markerCount}건`
              : unavailable
                ? "집테리어 정보를 불러올 수 없어요"
                : `단지 ${markerCount}곳`}
        </div>
      </div>

      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/95">
          <p className="text-sm text-muted">{mapError}</p>
        </div>
      )}
    </div>
  );
}

export default function ServiceMapPage() {
  return (
    <Suspense>
      <ServiceMapView />
    </Suspense>
  );
}
