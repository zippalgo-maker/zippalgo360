"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { loadKakaoMaps } from "@/lib/kakao-maps";
import type {
  ApartmentComplex,
  CompanyMapMarker,
  ListingMapMarker,
  ZipteriorMapMarkerListOut,
} from "@/lib/types";

// 집팔고360은 집팔고/집사고/집테리어/집이사/집청소가 신원(로그인)뿐 아니라
// 이 지도도 공유하는 통합 플랫폼이다 — 그래서 지도는 "모드 전환"이 아니라
// 여러 레이어를 동시에 켤 수 있는 구조로 만든다. 데이터가 아직 없는
// 서비스(집이사/집청소, 그리고 집팔고360 자체 온보딩에 아직 회원가입
// 경로가 없는 인테리어 업체)는 레이어 자리만 만들어두고 비활성 처리한다.
type LayerKey =
  | "listings"
  | "interiorPortfolio"
  | "company_real_estate"
  | "company_interior"
  | "company_mover"
  | "company_cleaner";

interface LayerDef {
  key: LayerKey;
  label: string;
  available: boolean;
}

const LAYER_DEFS: LayerDef[] = [
  { key: "listings", label: "매물(집팔고)", available: true },
  { key: "interiorPortfolio", label: "인테리어 시공사례(집테리어)", available: true },
  { key: "company_real_estate", label: "부동산 업체", available: true },
  { key: "company_interior", label: "인테리어 업체", available: false },
  { key: "company_mover", label: "이사업체", available: false },
  { key: "company_cleaner", label: "청소업체", available: false },
];

const COMPANY_LAYER_TYPE: Partial<Record<LayerKey, string>> = {
  company_real_estate: "real_estate",
  company_interior: "interior",
  company_mover: "mover",
  company_cleaner: "cleaner",
};

const COMPANY_LAYER_COLOR: Partial<Record<LayerKey, string>> = {
  company_real_estate: "#427cff",
  company_interior: "#21463b",
  company_mover: "#c98a2e",
  company_cleaner: "#2f9e6f",
};

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY ?? "";
const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 };

function ServiceMapView() {
  const searchParams = useSearchParams();
  const initialLayers: Set<LayerKey> =
    searchParams.get("mode") === "interior" ? new Set(["interiorPortfolio"]) : new Set(["listings"]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersByLayerRef = useRef<Record<LayerKey, any[]>>({} as Record<LayerKey, any[]>);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const infoWindowRef = useRef<any>(null);

  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(initialLayers);
  const activeLayersRef = useRef(activeLayers);
  activeLayersRef.current = activeLayers;
  const [isMapReady, setIsMapReady] = useState(false);
  const [loadingLayers, setLoadingLayers] = useState<Set<LayerKey>>(new Set());
  const [layerCounts, setLayerCounts] = useState<Partial<Record<LayerKey, number>>>({});
  const [interiorUnavailable, setInteriorUnavailable] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ApartmentComplex[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

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

  const clearLayerMarkers = useCallback((layer: LayerKey) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (markersByLayerRef.current[layer] ?? []).forEach((marker: any) => marker.setMap(null));
    markersByLayerRef.current[layer] = [];
  }, []);

  const loadListingMarkers = useCallback(async () => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const markers = await apiFetch<ListingMapMarker[]>(
      `/listings/map/markers?north=${ne.getLat()}&south=${sw.getLat()}&east=${ne.getLng()}&west=${sw.getLng()}&limit=500`
    );
    // 응답이 오는 사이 사용자가 이 레이어를 껐을 수 있음 — 그새 꺼진
    // 레이어를 되살리지 않도록 렌더링 직전에 다시 확인한다.
    if (!activeLayersRef.current.has("listings")) return;
    clearLayerMarkers("listings");
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
      markersByLayerRef.current.listings.push(marker);
    });
    setLayerCounts((prev) => ({ ...prev, listings: markers.length }));
  }, [clearLayerMarkers]);

  const loadInteriorMarkers = useCallback(async () => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const data = await apiFetch<ZipteriorMapMarkerListOut>(
      `/integrations/zipterior/map-markers?north=${ne.getLat()}&south=${sw.getLat()}&east=${ne.getLng()}&west=${sw.getLng()}&limit=500`
    );
    if (!activeLayersRef.current.has("interiorPortfolio")) return;
    clearLayerMarkers("interiorPortfolio");
    setInteriorUnavailable(!data.available);
    data.items.forEach((item) => {
      const position = new kakao.maps.LatLng(item.latitude, item.longitude);
      const marker = new kakao.maps.Marker({ position, map });
      kakao.maps.event.addListener(marker, "click", () => {
        infoWindowRef.current.setContent(
          `<div style="padding:10px 12px;min-width:180px;font-size:13px;line-height:1.6;">
            <strong>${item.name}</strong><br/>
            시공사례 ${item.portfolio_count}건<br/>
            <a href="https://zipterior.zippalgo360.com/?complex_id=${item.id}" target="_blank" rel="noreferrer" style="color:#bb1730;font-weight:600;">집테리어에서 보기 →</a>
          </div>`
        );
        infoWindowRef.current.open(map, marker);
      });
      markersByLayerRef.current.interiorPortfolio.push(marker);
    });
    setLayerCounts((prev) => ({ ...prev, interiorPortfolio: data.items.length }));
  }, [clearLayerMarkers]);

  const loadCompanyMarkers = useCallback(
    async (layer: LayerKey) => {
      const kakao = window.kakao;
      const map = mapRef.current;
      const companyType = COMPANY_LAYER_TYPE[layer];
      if (!kakao || !map || !companyType) return;
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const markers = await apiFetch<CompanyMapMarker[]>(
        `/companies/map/markers?company_type=${companyType}&north=${ne.getLat()}&south=${sw.getLat()}&east=${ne.getLng()}&west=${sw.getLng()}&limit=500`
      );
      if (!activeLayersRef.current.has(layer)) return;
      clearLayerMarkers(layer);
      const color = COMPANY_LAYER_COLOR[layer] ?? "#427cff";
      markers.forEach((item) => {
        const position = new kakao.maps.LatLng(item.latitude, item.longitude);
        const dot = document.createElement("div");
        dot.style.cssText = `width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer;`;
        const overlay = new kakao.maps.CustomOverlay({ position, content: dot, map, yAnchor: 0.5, xAnchor: 0.5 });
        dot.addEventListener("click", () => {
          infoWindowRef.current.setContent(
            `<div style="padding:10px 12px;min-width:160px;font-size:13px;line-height:1.6;">
              <strong>${item.business_name}</strong>
            </div>`
          );
          infoWindowRef.current.open(map, overlay);
        });
        markersByLayerRef.current[layer].push(overlay);
      });
      setLayerCounts((prev) => ({ ...prev, [layer]: markers.length }));
    },
    [clearLayerMarkers]
  );

  const loadLayer = useCallback(
    (layer: LayerKey) => {
      if (layer === "listings") return loadListingMarkers();
      if (layer === "interiorPortfolio") return loadInteriorMarkers();
      return loadCompanyMarkers(layer);
    },
    [loadListingMarkers, loadInteriorMarkers, loadCompanyMarkers]
  );

  useEffect(() => {
    if (!isMapReady) return;
    const kakao = window.kakao;
    const map = mapRef.current;

    const refresh = () => {
      // 켜진 레이어만 병렬로 불러온다 — 꺼진 레이어는 요청 자체를 안 보내는
      // 게 지도 반응 속도에 제일 중요하다.
      activeLayers.forEach((layer) => {
        setLoadingLayers((prev) => new Set(prev).add(layer));
        loadLayer(layer).finally(() => {
          setLoadingLayers((prev) => {
            const next = new Set(prev);
            next.delete(layer);
            return next;
          });
        });
      });
    };

    refresh();
    kakao.maps.event.addListener(map, "idle", refresh);
    return () => {
      kakao.maps.event.removeListener(map, "idle", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapReady, activeLayers]);

  const toggleLayer = useCallback((layer: LayerKey, available: boolean) => {
    if (!available) return;
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
        clearLayerMarkers(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  }, [clearLayerMarkers]);

  useEffect(() => {
    const keyword = query.trim();
    if (keyword.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      apiFetch<ApartmentComplex[]>(`/apartments/complexes?keyword=${encodeURIComponent(keyword)}`)
        .then((items) => setSearchResults(items))
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectComplex = useCallback((complex: ApartmentComplex) => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map || complex.latitude == null || complex.longitude == null) return;
    map.setLevel(4);
    map.setCenter(new kakao.maps.LatLng(complex.latitude, complex.longitude));
    setQuery(complex.name);
    setShowResults(false);
  }, []);

  const isLoading = loadingLayers.size > 0;

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <div ref={mapContainerRef} className="h-full w-full bg-soft" />

      <div className="absolute left-4 top-4 z-10 w-72 max-w-[calc(100%-2rem)]">
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
          placeholder="단지명, 지역으로 검색"
          className="w-full rounded-full border border-line bg-white px-4 py-2.5 text-sm shadow-md outline-none focus:border-brand-red"
        />
        {showResults && query.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-full mt-2 max-h-80 overflow-y-auto rounded-xl border border-line bg-white shadow-lg">
            {isSearching ? (
              <p className="px-4 py-3 text-sm text-muted">검색 중...</p>
            ) : searchResults.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted">검색 결과가 없어요</p>
            ) : (
              searchResults.map((complex) => (
                <button
                  key={complex.id}
                  type="button"
                  onClick={() => handleSelectComplex(complex)}
                  className="block w-full border-b border-line px-4 py-2.5 text-left last:border-b-0 hover:bg-soft"
                >
                  <div className="text-sm font-semibold text-ink">{complex.name}</div>
                  <div className="text-xs text-muted">{complex.road_address}</div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-2">
        <div className="w-56 rounded-xl border border-line bg-white/95 p-3 shadow-md">
          <p className="mb-2 text-xs font-semibold text-muted">지도에 표시할 레이어</p>
          <ul className="flex flex-col gap-1.5">
            {LAYER_DEFS.map((layer) => (
              <li key={layer.key} className="flex items-center justify-between gap-2 text-sm">
                <label
                  className={`flex flex-1 items-center gap-2 ${
                    layer.available ? "cursor-pointer text-ink" : "cursor-not-allowed text-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={activeLayers.has(layer.key)}
                    disabled={!layer.available}
                    onChange={() => toggleLayer(layer.key, layer.available)}
                  />
                  {layer.label}
                </label>
                {!layer.available ? (
                  <span className="text-xs text-muted">준비중</span>
                ) : activeLayers.has(layer.key) ? (
                  <span className="text-xs text-muted">
                    {layer.key === "interiorPortfolio" && interiorUnavailable
                      ? "불러올 수 없음"
                      : (layerCounts[layer.key] ?? 0).toLocaleString()}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        {isLoading && (
          <div className="rounded-xl border border-line bg-white/95 px-3 py-2 text-xs text-muted shadow-md">
            불러오는 중...
          </div>
        )}
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
