"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { loadKakaoMaps } from "@/lib/kakao-maps";
import { buildCountMarkerHtml, buildFanMarkerHtml } from "@/lib/interior-marker";
import InteriorComplexPanel from "@/components/map/InteriorComplexPanel";
import InteriorPortfolioPanel from "@/components/map/InteriorPortfolioPanel";
import type {
  ApartmentComplex,
  CompanyMapMarker,
  ListingMapMarker,
  ZipteriorComplexDetailOut,
  ZipteriorMapMarker,
  ZipteriorMapMarkerListOut,
  ZipteriorPortfolioSummary,
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

// 집팔고(매물+부동산업체) ↔ 집테리어(시공사례+인테리어업체)는 지도 위
// 초록/빨강 마커가 뒤섞여 보이면 어느 쪽 숫자인지 헷갈리기 때문에, 둘 중
// 한 그룹을 켜면 반대 그룹은 자동으로 꺼지도록 상호배타 처리한다(이사/
// 청소업체는 어느 그룹에도 속하지 않아 자유롭게 중복 선택 가능).
const LAYER_GROUP_ZIPPALGO: ReadonlySet<LayerKey> = new Set(["listings", "company_real_estate"]);
const LAYER_GROUP_ZIPTERIOR: ReadonlySet<LayerKey> = new Set(["interiorPortfolio", "company_interior"]);

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
// company_interior(인테리어 업체) 레이어는 집테리어가 줌 레벨에 맞춰
// 미리 클러스터링해서 내려주는 /api/v1/public/map/viewport를 그대로 쓴다
// — source_limit은 "화면에 그릴 개수"가 아니라 "서버가 클러스터링 전에
// 얼마나 원본을 모을지"라, 서버 클러스터링 덕에 브라우저 성능과 무관함.
// 집테리어 라우터의 실제 상한(le=5000)까지 그대로 씀.
// (2026-08-26 정정: interiorPortfolio 레이어는 더 이상 이 엔드포인트를
// 안 씀 — 아래 INTERIOR_* 상수/redrawInteriorClusters 설명 참고. 실제
// 집테리어 데스크톱 지도(js/app.js)를 다시 확인해보니 이 서버 사전
// 클러스터링이 아니라 원본 마커를 받아 클라이언트에서 직접 격자
// 클러스터링하는 방식이었음 — 이전 조사가 틀렸었다.)
const ZIPTERIOR_SOURCE_LIMIT = 5000;

// interiorPortfolio 레이어는 집테리어 데스크톱 지도(js/app.js +
// js/map-provider.js)와 완전히 동일하게 동작하도록, 서버 사전
// 클러스터링(/viewport) 대신 원본 마커(/map-markers, bbox 제한)를 받아
// **클라이언트에서** 집테리어와 똑같은 격자 클러스터링을 직접 수행한다.
// 집테리어 프론트가 쓰는 그대로:
//   clusterCell(zoom) = 20 / 1.8^zoom  (zoom은 leaflet 스타일 — 즉
//   toZipteriorZoom과 동일한 변환이 필요)
//   disableClusteringAtZoom: 15 (그 줌 이상은 클러스터링 없이 개별 마커)
// 이 두 상수/공식이 다르면 축척이 같아도 뭉치는 개수·위치가 달라진다는
// 걸 사용자가 같은 화면을 나란히 캡처해서 실측으로 증명함(2026-08-26).
const INTERIOR_DISABLE_CLUSTERING_AT_ZOOM = 15;
const INTERIOR_MARKERS_FETCH_LIMIT = 3000; // 집테리어 /public/map/markers 자체 상한과 동일
function interiorClusterCellDegrees(leafletZoom: number): number {
  return 20 / Math.pow(1.8, leafletZoom);
}

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY ?? "";
// 집테리어 자체 지도(js/app.js)의 시작 위치/축척과 동일하게 맞춘다
// (성수JC 부근, 카카오 레벨 7 = 집테리어의 leaflet 스타일 줌 11).
const MAP_START_CENTER = { lat: 37.5445, lng: 127.0559 };
const MAP_START_LEVEL = 7;

// 집테리어의 /api/v1/public/map/viewport(PublicMapService.cluster_cell_degrees,
// app/modules/public_map/service.py)는 카카오 레벨이 아니라 "숫자가 클수록
// 더 확대된" leaflet 스타일 줌을 기대한다(zoom<=7→0.5도 격자, zoom>15→
// 클러스터링 해제) — 집테리어 프론트(js/map-provider.js fromKakaoLevel)도
// 클라이언트 클러스터링에 같은 변환을 쓴다. 카카오 레벨을 그대로 넘기면
// (레벨이 작을수록 확대) 방향이 반대라, 축소된 화면일수록 서버가 오히려
// "많이 확대된 것"으로 착각해 격자를 필요 이상으로 좁게/넓게 잡아
// 마커가 서로 겹치는 문제가 있었다(2026-08-26 사용자 스크린샷으로 확인).
function toZipteriorZoom(kakaoLevel: number): number {
  return Math.min(18, Math.max(4, 18 - kakaoLevel));
}

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

  // "인테리어 시공사례" 레이어의 개별(비클러스터) 마커 — 집테리어 지도와
  // 동일하게, 클릭하면 이 마커 자체가 부챗살(fan) 모양으로 바뀐다. 그러려면
  // 마커별 DOM 엘리먼트와 원본 데이터를 계속 들고 있어야 해서 별도 ref로
  // 관리한다(다른 레이어처럼 클릭 즉시 인포윈도우만 띄우고 끝나지 않음).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const interiorMarkerElementsRef = useRef<Map<number, { el: HTMLDivElement; overlay: any; item: ZipteriorMapMarker }>>(
    new Map()
  );
  const interiorComplexCacheRef = useRef<Map<number, ZipteriorComplexDetailOut>>(new Map());
  // 지도를 이동하며 지금까지 불러온 원본(비클러스터) 단지 마커 전체 —
  // 집테리어 자체 지도(js/app.js의 complexes 배열)와 동일하게, bbox 밖으로
  // 나가도 지우지 않고 계속 누적한다. 클러스터링은 이 누적분 전체를
  // 대상으로 매번 다시 계산한다(redrawInteriorClusters).
  const interiorRawMarkersRef = useRef<Map<number, ZipteriorMapMarker>>(new Map());
  const [selectedComplexId, setSelectedComplexId] = useState<number | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<ZipteriorPortfolioSummary | null>(null);
  // idle 이벤트로 뷰포트가 다시 로드될 때 쓰는 렌더 함수는 지도가 처음
  // 준비되거나 activeLayers가 바뀔 때만 새로 붙기 때문에(아래 useEffect의
  // 의존성 배열 참고), 그 클로저 안에서 selectedComplexId/selectedArea를
  // 직접 읽으면 오래된 값이 남는다 — activeLayersRef와 같은 이유로 ref에
  // 최신 값을 담아 항상 최신값을 읽게 한다.
  const selectedComplexIdRef = useRef<number | null>(null);
  selectedComplexIdRef.current = selectedComplexId;
  const selectedAreaRef = useRef<string | null>(null);
  selectedAreaRef.current = selectedArea;

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
          center: new kakao.maps.LatLng(MAP_START_CENTER.lat, MAP_START_CENTER.lng),
          level: MAP_START_LEVEL,
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

  // 부챗살 마커를 원래의 "시공 N" 원형 배지로 되돌린다(단지 선택 해제 시).
  const collapseInteriorMarker = useCallback((complexId: number) => {
    const entry = interiorMarkerElementsRef.current.get(complexId);
    if (!entry) return;
    entry.el.innerHTML = buildCountMarkerHtml(entry.item.portfolio_count, entry.item.name ?? undefined);
    entry.overlay.setZIndex?.(0);
  }, []);

  const closeInteriorPanels = useCallback(() => {
    setSelectedComplexId((current) => {
      if (current != null) collapseInteriorMarker(current);
      return null;
    });
    setSelectedArea(null);
    setSelectedPortfolio(null);
  }, [collapseInteriorMarker]);

  // 부챗살 마커 안의 조각(평형 타입) 클릭, 닫기 버튼, 단지명/시공건수
  // 클릭에 이벤트를 건다 — 집테리어 지도(js/app.js bindFanInteractions)와
  // 동일한 3가지 상호작용. closeInteriorPanels는 collapseInteriorMarker에만
  // 의존하는 안정적인(stable) 콜백이라 ref로 감쌀 필요 없이 그대로 캡처한다.
  const bindFanInteractions = useCallback(
    (el: HTMLDivElement, complex: ZipteriorComplexDetailOut) => {
      el.querySelectorAll<HTMLElement>(".zpi-fan-sector").forEach((sector) => {
        sector.addEventListener("click", (event) => {
          event.stopPropagation();
          const area = sector.dataset.area;
          const type = sector.dataset.type;
          if (area == null || type == null) return;
          setSelectedArea(`${area}|${type}`);
        });
      });
      el.querySelector<HTMLElement>("[data-fan-close]")?.addEventListener("click", (event) => {
        event.stopPropagation();
        closeInteriorPanels();
      });
      el.querySelectorAll<HTMLElement>("[data-fan-open-basic]").forEach((node) => {
        node.addEventListener("click", (event) => {
          event.stopPropagation();
          setSelectedComplexId(complex.id);
        });
      });
    },
    [closeInteriorPanels]
  );

  // 단지 마커를 클릭했을 때: 단지 상세를 받아와 그 마커를 부챗살로
  // 바꾸고 패널을 연다(집테리어의 selectComplex와 동일한 흐름).
  const openInteriorComplex = useCallback(
    async (complexId: number) => {
      setSelectedComplexId((current) => {
        if (current != null && current !== complexId) collapseInteriorMarker(current);
        return complexId;
      });
      setSelectedArea(null);
      setSelectedPortfolio(null);

      let complex = interiorComplexCacheRef.current.get(complexId);
      if (!complex) {
        try {
          complex = await apiFetch<ZipteriorComplexDetailOut>(`/integrations/zipterior/complexes/${complexId}`);
          interiorComplexCacheRef.current.set(complexId, complex);
        } catch {
          return;
        }
      }
      if (!complex.available) return;
      const entry = interiorMarkerElementsRef.current.get(complexId);
      if (!entry) return;
      entry.el.innerHTML = buildFanMarkerHtml(complex, null);
      entry.overlay.setZIndex?.(10000);
      bindFanInteractions(entry.el, complex);
    },
    [collapseInteriorMarker, bindFanInteractions]
  );

  // 지금까지 누적된 원본 단지 마커 하나를 "표준 배지" 상태로 그린다
  // (클러스터에 안 묶이고 혼자 남은 마커, 또는 클러스터링이 꺼지는 최대
  // 줌에서의 개별 마커).
  const renderInteriorStandardMarker = useCallback(
    (marker: ZipteriorMapMarker) => {
      const kakao = window.kakao;
      const map = mapRef.current;
      const position = new kakao.maps.LatLng(marker.latitude, marker.longitude);
      const el = document.createElement("div");
      el.innerHTML = buildCountMarkerHtml(marker.portfolio_count, marker.name);
      const overlay = new kakao.maps.CustomOverlay({
        position,
        content: el,
        map,
        yAnchor: 0.5,
        xAnchor: 0.5,
        zIndex: 0,
      });
      interiorMarkerElementsRef.current.set(marker.id, { el, overlay, item: marker });
      el.addEventListener("click", () => openInteriorComplex(marker.id));
      markersByLayerRef.current.interiorPortfolio.push(overlay);
    },
    [openInteriorComplex]
  );

  // interiorPortfolio 레이어의 클러스터링+렌더 — 집테리어 데스크톱 지도
  // (js/map-provider.js의 ClusterGroup.redraw())와 완전히 동일한 알고리즘
  // 을 그대로 옮긴 것: 지금까지 누적된 원본 마커 전체를 매번 다시 격자로
  // 묶어서 클러스터/개별 마커를 새로 그린다. 개별 마커를 클릭하면
  // 인포윈도우 대신 그 마커 자체가 부챗살로 바뀌고 옆에 단지 정보 패널이
  // 열린다(집테리어와 동일한 UX, 다른 레이어의 renderViewportItems와는
  // 다름).
  const redrawInteriorClusters = useCallback(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map || !activeLayersRef.current.has("interiorPortfolio")) return;

    clearLayerMarkers("interiorPortfolio");
    interiorMarkerElementsRef.current.clear();

    const markers = Array.from(interiorRawMarkersRef.current.values());
    const leafletZoom = toZipteriorZoom(map.getLevel());
    let totalPortfolios = 0;

    if (leafletZoom >= INTERIOR_DISABLE_CLUSTERING_AT_ZOOM) {
      markers.forEach((marker) => {
        totalPortfolios += marker.portfolio_count;
        renderInteriorStandardMarker(marker);
      });
    } else {
      const cell = interiorClusterCellDegrees(leafletZoom);
      const buckets = new Map<string, ZipteriorMapMarker[]>();
      markers.forEach((marker) => {
        const key = `${Math.floor(marker.latitude / cell)}:${Math.floor(marker.longitude / cell)}`;
        const bucket = buckets.get(key);
        if (bucket) bucket.push(marker);
        else buckets.set(key, [marker]);
      });
      buckets.forEach((bucket) => {
        const portfolioSum = bucket.reduce((sum, m) => sum + m.portfolio_count, 0);
        totalPortfolios += portfolioSum;
        if (bucket.length === 1) {
          renderInteriorStandardMarker(bucket[0]);
          return;
        }
        const lat = bucket.reduce((sum, m) => sum + m.latitude, 0) / bucket.length;
        const lng = bucket.reduce((sum, m) => sum + m.longitude, 0) / bucket.length;
        const position = new kakao.maps.LatLng(lat, lng);
        const el = document.createElement("div");
        el.innerHTML = buildCountMarkerHtml(portfolioSum);
        const overlay = new kakao.maps.CustomOverlay({ position, content: el, map, yAnchor: 0.5, xAnchor: 0.5, zIndex: 0 });
        el.addEventListener("click", () => {
          map.setLevel(Math.max(1, map.getLevel() - 2));
          map.setCenter(position);
        });
        markersByLayerRef.current.interiorPortfolio.push(overlay);
      });
    }

    setLayerCounts((prev) => ({ ...prev, interiorPortfolio: totalPortfolios }));

    // 재계산 중에도 이미 펼쳐 놓았던 단지가 여전히 개별 마커로 남아있으면
    // 부챗살 상태를 그대로 복원한다 — 새로 만든 마커는 기본적으로 표준
    // 배지 상태이기 때문.
    const currentComplexId = selectedComplexIdRef.current;
    if (currentComplexId != null) {
      const cached = interiorComplexCacheRef.current.get(currentComplexId);
      const entry = interiorMarkerElementsRef.current.get(currentComplexId);
      if (cached?.available && entry) {
        entry.el.innerHTML = buildFanMarkerHtml(cached, selectedAreaRef.current);
        entry.overlay.setZIndex?.(10000);
        bindFanInteractions(entry.el, cached);
      }
    }
  }, [clearLayerMarkers, renderInteriorStandardMarker, bindFanInteractions]);

  // 단지 정보 패널에서 평형 타입 탭을 눌러 selectedArea가 바뀌면, 지도
  // 위 부챗살 마커의 활성 조각(active 표시)도 같이 갱신한다.
  useEffect(() => {
    if (selectedComplexId == null) return;
    const complex = interiorComplexCacheRef.current.get(selectedComplexId);
    const entry = interiorMarkerElementsRef.current.get(selectedComplexId);
    if (!complex?.available || !entry) return;
    entry.el.innerHTML = buildFanMarkerHtml(complex, selectedArea);
    bindFanInteractions(entry.el, complex);
  }, [selectedArea, selectedComplexId, bindFanInteractions]);

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
            <a href="/zippalgo/listings/${item.id}" style="color:#bb1730;font-weight:600;">매물 상세보기 →</a>
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

  // 원본(비클러스터) 단지 마커를 bbox 범위로 받아 누적한 뒤, 집테리어와
  // 동일한 클라이언트 격자 클러스터링으로 다시 그린다 — 서버 사전
  // 클러스터링(/viewport)은 더 이상 이 레이어에 안 씀(위 INTERIOR_* 상수
  // 설명 참고). 집테리어 자체 지도가 새 bbox 마커를 받을 때마다 하는 것과
  // 동일하게, 이미 알고 있는 단지는 건너뛰고 새로 들어온 것만 누적한다.
  const loadInteriorMarkers = useCallback(async () => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const data = await apiFetch<ZipteriorMapMarkerListOut>(
      `/integrations/zipterior/map-markers?north=${ne.getLat()}&south=${sw.getLat()}&east=${ne.getLng()}&west=${sw.getLng()}&limit=${INTERIOR_MARKERS_FETCH_LIMIT}`
    );
    if (!activeLayersRef.current.has("interiorPortfolio")) return;
    setLayerUnavailable("interiorPortfolio", !data.available);
    data.items.forEach((marker) => {
      interiorRawMarkersRef.current.set(marker.id, marker);
    });
    redrawInteriorClusters();
  }, [setLayerUnavailable, redrawInteriorClusters]);

  const loadInteriorCompanyMarkers = useCallback(async () => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const data = await apiFetch<ZipteriorViewportOut>(
      `/integrations/zipterior/viewport?marker_type=company&zoom=${toZipteriorZoom(map.getLevel())}&north=${ne.getLat()}&south=${sw.getLat()}&east=${ne.getLng()}&west=${sw.getLng()}&source_limit=${ZIPTERIOR_SOURCE_LIMIT}`
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

  const deactivateLayer = useCallback(
    (next: Set<LayerKey>, layer: LayerKey) => {
      next.delete(layer);
      clearLayerMarkers(layer);
      if (layer === "interiorPortfolio") {
        interiorMarkerElementsRef.current.clear();
        closeInteriorPanels();
      }
    },
    [clearLayerMarkers, closeInteriorPanels]
  );

  const toggleLayer = useCallback(
    (layer: LayerKey, available: boolean) => {
      if (!available) return;
      setActiveLayers((prev) => {
        const next = new Set(prev);
        if (next.has(layer)) {
          deactivateLayer(next, layer);
        } else {
          const opposingGroup = LAYER_GROUP_ZIPPALGO.has(layer)
            ? LAYER_GROUP_ZIPTERIOR
            : LAYER_GROUP_ZIPTERIOR.has(layer)
              ? LAYER_GROUP_ZIPPALGO
              : null;
          opposingGroup?.forEach((opposingLayer) => {
            if (next.has(opposingLayer)) deactivateLayer(next, opposingLayer);
          });
          next.add(layer);
        }
        return next;
      });
    },
    [deactivateLayer]
  );

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
          {activeLayers.has("interiorPortfolio") && (
            <p className="mt-2 border-t border-line pt-2 text-[11px] leading-relaxed text-brand-green">
              초록색 마커는 실제 단지별 시공사례 수 입니다.
            </p>
          )}
          {activeLayers.has("listings") && (
            <p className="mt-2 border-t border-line pt-2 text-[11px] leading-relaxed text-brand-red">
              붉은색 마커는 단지별 매물 수 입니다.
            </p>
          )}
        </div>

        {isLoading && (
          <div className="rounded-xl border border-line bg-white/95 px-3 py-2 text-xs text-muted shadow-md">
            불러오는 중...
          </div>
        )}
      </div>

      {activeLayers.has("interiorPortfolio") && selectedComplexId != null && (
        <InteriorComplexPanel
          complexId={selectedComplexId}
          selectedArea={selectedArea}
          onSelectArea={setSelectedArea}
          onClose={closeInteriorPanels}
          onOpenPortfolio={setSelectedPortfolio}
        />
      )}
      {selectedPortfolio && (
        <InteriorPortfolioPanel portfolioId={selectedPortfolio.id} onClose={() => setSelectedPortfolio(null)} />
      )}

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
