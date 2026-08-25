"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { loadKakaoMaps } from "@/lib/kakao-maps";
import type {
  ApartmentComplex,
  CompanyMapMarker,
  ListingMapMarker,
  ZipteriorViewportItem,
  ZipteriorViewportOut,
} from "@/lib/types";

// 집팔고360은 집팔고/집사고/집테리어/집이사/집청소가 신원(로그인)뿐 아니라
// 이 지도도 공유하는 통합 플랫폼이다 — 그래서 지도는 "모드 전환"이 아니라
// 여러 레이어를 동시에 켤 수 있는 구조로 만든다. 인테리어 업체는 집테리어
// 자체 DB에 데이터가 있어서 zipterior_client 프록시로 가져온다(집팔고360
// 자기 companies 테이블은 온보딩이 real_estate만 지원해서 비어있음).
// 이사/청소업체는 그 서비스 자체가 아직 준비 중이라 레이어 자리만 둔다.
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
  { key: "company_interior", label: "인테리어 업체", available: true },
  { key: "company_mover", label: "이사업체", available: false },
  { key: "company_cleaner", label: "청소업체", available: false },
];

// 집팔고360 자체 companies 테이블에서 바로 조회하는 레이어만 여기 둔다.
// company_interior는 집테리어 프록시(loadInteriorCompanyMarkers)로 별도 처리.
const COMPANY_LAYER_TYPE: Partial<Record<LayerKey, string>> = {
  company_real_estate: "real_estate",
  company_mover: "mover",
  company_cleaner: "cleaner",
};

const COMPANY_LAYER_COLOR: Partial<Record<LayerKey, string>> = {
  company_real_estate: "#427cff",
  company_interior: "#21463b",
  company_mover: "#c98a2e",
  company_cleaner: "#2f9e6f",
};

// 매물 레이어는 아직 우리 쪽에 서버 클러스터링이 없어서 원본 마커를
// 그대로 가져와 클라이언트에서 카카오 공식 클러스터러로 뭉친다.
const CLUSTERED_LAYERS: ReadonlySet<LayerKey> = new Set(["listings"]);
// 우리 DB(인덱스 있음, 직접 제어 가능)로 가는 요청은 넉넉하게.
const MARKER_FETCH_LIMIT = 5000;
// 집테리어로 프록시되는 두 레이어(인테리어 시공사례/업체)는 원본 마커 대신
// 집테리어가 줌 레벨에 맞춰 미리 클러스터링해서 내려주는
// /api/v1/public/map/viewport를 쓴다(집테리어 자체 지도와 같은 방식,
// 2026-08-25 소스 확인) — 그래서 여기 보내는 source_limit은 "화면에
// 그릴 개수"가 아니라 "서버가 클러스터링 전에 얼마나 원본을 모을지"라
// 3000(집테리어 쪽 실제 상한)으로 넉넉히 잡아도 렌더링 비용은 낮다.
const ZIPTERIOR_SOURCE_LIMIT = 3000;

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
  const clusterersByLayerRef = useRef<Partial<Record<LayerKey, any>>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const infoWindowRef = useRef<any>(null);

  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(initialLayers);
  const activeLayersRef = useRef(activeLayers);
  activeLayersRef.current = activeLayers;
  const pendingLayersRef = useRef<Set<LayerKey>>(new Set());
  const [isMapReady, setIsMapReady] = useState(false);
  const [loadingLayers, setLoadingLayers] = useState<Set<LayerKey>>(new Set());
  const [layerCounts, setLayerCounts] = useState<Partial<Record<LayerKey, number>>>({});
  const [unavailableLayers, setUnavailableLayers] = useState<Set<LayerKey>>(new Set());
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
        CLUSTERED_LAYERS.forEach((layer) => {
          clusterersByLayerRef.current[layer] = new kakao.maps.MarkerClusterer({
            map,
            averageCenter: true,
            minLevel: 6,
            disableClickZoom: false,
          });
        });
        setIsMapReady(true);
      })
      .catch((err) => setMapError(err instanceof Error ? err.message : "카카오맵을 불러오지 못했습니다."));
    return () => {
      cancelled = true;
    };
  }, []);

  const clearLayerMarkers = useCallback((layer: LayerKey) => {
    const clusterer = clusterersByLayerRef.current[layer];
    if (clusterer) {
      clusterer.clear();
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (markersByLayerRef.current[layer] ?? []).forEach((marker: any) => marker.setMap(null));
    }
    markersByLayerRef.current[layer] = [];
  }, []);

  const setLayerUnavailable = useCallback((layer: LayerKey, unavailable: boolean) => {
    setUnavailableLayers((prev) => {
      const next = new Set(prev);
      if (unavailable) next.add(layer);
      else next.delete(layer);
      return next;
    });
  }, []);

  // 집테리어 viewport 응답(이미 서버에서 줌 레벨에 맞춰 클러스터링됨)을
  // 렌더링한다. 클러스터 항목은 숫자 뱃지로, 개별 항목은 작은 점으로
  // 그리고 클러스터 클릭 시 그 위치로 확대한다 — 마커를 카카오
  // 클러스터러에 넘기지 않는다(이미 뭉쳐서 온 소수의 항목이라 그럴 필요가
  // 없음, 이게 원본 마커를 다 보내던 이전 방식보다 훨씬 가벼운 이유).
  const renderViewportItems = useCallback(
    (layer: LayerKey, items: ZipteriorViewportItem[], color: string, buildContent: (item: ZipteriorViewportItem) => string) => {
      const kakao = window.kakao;
      const map = mapRef.current;
      items.forEach((item) => {
        const position = new kakao.maps.LatLng(item.latitude, item.longitude);
        const isCluster = item.item_type === "cluster";
        const el = document.createElement("div");
        if (isCluster) {
          const size = Math.min(56, 28 + Math.round(Math.log10(item.count + 1) * 12));
          el.style.cssText = `display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:${color};color:#fff;font-size:12px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.35);cursor:pointer;border:2px solid white;`;
          el.textContent = item.count.toLocaleString();
        } else {
          el.style.cssText = `width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer;`;
        }
        const overlay = new kakao.maps.CustomOverlay({ position, content: el, map, yAnchor: 0.5, xAnchor: 0.5 });
        el.addEventListener("click", () => {
          if (isCluster) {
            map.setLevel(Math.max(1, map.getLevel() - 2));
            map.setCenter(position);
            return;
          }
          infoWindowRef.current.setContent(buildContent(item));
          infoWindowRef.current.open(map, overlay);
        });
        markersByLayerRef.current[layer].push(overlay);
      });
    },
    []
  );

  const loadListingMarkers = useCallback(async () => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const markers = await apiFetch<ListingMapMarker[]>(
      `/listings/map/markers?north=${ne.getLat()}&south=${sw.getLat()}&east=${ne.getLng()}&west=${sw.getLng()}&limit=${MARKER_FETCH_LIMIT}`
    );
    // 응답이 오는 사이 사용자가 이 레이어를 껐을 수 있음 — 그새 꺼진
    // 레이어를 되살리지 않도록 렌더링 직전에 다시 확인한다.
    if (!activeLayersRef.current.has("listings")) return;
    clearLayerMarkers("listings");
    // 클러스터러가 지도 부착을 관리하므로 마커 생성 시 map을 주지 않는다.
    const kakaoMarkers = markers.map((item) => {
      const position = new kakao.maps.LatLng(item.latitude, item.longitude);
      const marker = new kakao.maps.Marker({ position });
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
      return marker;
    });
    markersByLayerRef.current.listings = kakaoMarkers;
    clusterersByLayerRef.current.listings.addMarkers(kakaoMarkers);
    setLayerCounts((prev) => ({ ...prev, listings: markers.length }));
  }, [clearLayerMarkers]);

  const loadInteriorMarkers = useCallback(async () => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const data = await apiFetch<ZipteriorViewportOut>(
      `/integrations/zipterior/viewport?marker_type=complex&has_portfolio=true&zoom=${map.getLevel()}&north=${ne.getLat()}&south=${sw.getLat()}&east=${ne.getLng()}&west=${sw.getLng()}&source_limit=${ZIPTERIOR_SOURCE_LIMIT}`
    );
    if (!activeLayersRef.current.has("interiorPortfolio")) return;
    clearLayerMarkers("interiorPortfolio");
    setLayerUnavailable("interiorPortfolio", !data.available);
    renderViewportItems("interiorPortfolio", data.items, "#bb1730", (item) =>
      `<div style="padding:10px 12px;min-width:180px;font-size:13px;line-height:1.6;">
        <strong>${item.name}</strong><br/>
        시공사례 ${item.portfolio_count}건<br/>
        <a href="https://zipterior.zippalgo360.com/?complex_id=${item.id}" target="_blank" rel="noreferrer" style="color:#bb1730;font-weight:600;">집테리어에서 보기 →</a>
      </div>`
    );
    setLayerCounts((prev) => ({ ...prev, interiorPortfolio: data.source_marker_count }));
  }, [clearLayerMarkers, setLayerUnavailable, renderViewportItems]);

  const loadInteriorCompanyMarkers = useCallback(async () => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const data = await apiFetch<ZipteriorViewportOut>(
      `/integrations/zipterior/viewport?marker_type=company&zoom=${map.getLevel()}&north=${ne.getLat()}&south=${sw.getLat()}&east=${ne.getLng()}&west=${sw.getLng()}&source_limit=${ZIPTERIOR_SOURCE_LIMIT}`
    );
    if (!activeLayersRef.current.has("company_interior")) return;
    clearLayerMarkers("company_interior");
    setLayerUnavailable("company_interior", !data.available);
    const color = COMPANY_LAYER_COLOR.company_interior ?? "#21463b";
    renderViewportItems("company_interior", data.items, color, (item) =>
      `<div style="padding:10px 12px;min-width:160px;font-size:13px;line-height:1.6;">
        <strong>${item.name}</strong><br/>
        시공사례 ${item.portfolio_count}건
      </div>`
    );
    setLayerCounts((prev) => ({ ...prev, company_interior: data.source_marker_count }));
  }, [clearLayerMarkers, setLayerUnavailable, renderViewportItems]);

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
        `/companies/map/markers?company_type=${companyType}&north=${ne.getLat()}&south=${sw.getLat()}&east=${ne.getLng()}&west=${sw.getLng()}&limit=${MARKER_FETCH_LIMIT}`
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
      if (layer === "company_interior") return loadInteriorCompanyMarkers();
      return loadCompanyMarkers(layer);
    },
    [loadListingMarkers, loadInteriorMarkers, loadInteriorCompanyMarkers, loadCompanyMarkers]
  );

  useEffect(() => {
    if (!isMapReady) return;
    const kakao = window.kakao;
    const map = mapRef.current;

    const runLayer = (layer: LayerKey) => {
      // 이 레이어에 이미 요청이 진행 중이면 또 쏘지 않는다 — 빠르게 연속
      // 확대/축소하면 idle이 짧은 간격으로 여러 번 발생하는데, 매번 수천
      // 개짜리 마커를 새로 fetch+렌더링하면 그게 그대로 쌓여서 버벅거림의
      // 원인이 된다.
      if (pendingLayersRef.current.has(layer)) return;
      pendingLayersRef.current.add(layer);
      setLoadingLayers((prev) => new Set(prev).add(layer));
      loadLayer(layer)
        .catch((err) => {
          // API 응답 자체가 available:false를 주는 경우 말고, 요청/렌더링
          // 도중 예외가 나서 조용히 실패하는 경우도 화면에 "불러올 수
          // 없음"으로 드러나게 한다(그냥 0건으로 보이면 실제로 0건인지
          // 에러인지 구분이 안 됨).
          console.error(`[map] ${layer} 레이어 로딩 실패`, err);
          setLayerUnavailable(layer, true);
        })
        .finally(() => {
          pendingLayersRef.current.delete(layer);
          setLoadingLayers((prev) => {
            const next = new Set(prev);
            next.delete(layer);
            return next;
          });
        });
    };

    const refresh = () => {
      // 켜진 레이어만 병렬로 불러온다 — 꺼진 레이어는 요청 자체를 안 보내는
      // 게 지도 반응 속도에 제일 중요하다.
      activeLayers.forEach(runLayer);
    };

    // idle이 연속으로 여러 번 발생해도(빠른 연속 확대/축소) 실제로는
    // 한 번만 불러오도록 살짝 디바운스한다.
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(refresh, 250);
    };

    refresh();
    kakao.maps.event.addListener(map, "idle", debouncedRefresh);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      kakao.maps.event.removeListener(map, "idle", debouncedRefresh);
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
                    {unavailableLayers.has(layer.key)
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
