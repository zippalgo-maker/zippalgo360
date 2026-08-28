"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { loadKakaoMaps } from "@/lib/kakao-maps";
import { buildCountMarkerHtml, buildFanMarkerHtml, type AreaUnit } from "@/lib/interior-marker";
import InteriorComplexPanel from "@/components/map/InteriorComplexPanel";
import InteriorPortfolioPanel from "@/components/map/InteriorPortfolioPanel";
import NearbyPortfolioWidget from "@/components/map/NearbyPortfolioWidget";
import type {
  CompanyMapMarker,
  ListingMapMarker,
  ZipteriorComplexDetailOut,
  ZipteriorMapMarker,
  ZipteriorMapMarkerListOut,
  ZipteriorPortfolioSummary,
  ZipteriorSearchItem,
  ZipteriorSearchOut,
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
  { key: "listings", label: "매물", available: true },
  { key: "interiorPortfolio", label: "인테리어 시공사례", available: true },
  { key: "company_real_estate", label: "부동산 업체", available: true },
  { key: "company_interior", label: "인테리어 업체", available: true },
  { key: "company_mover", label: "이사업체", available: false },
  { key: "company_cleaner", label: "청소업체", available: false },
];

// 레이어 패널 카드를 "집팔고/집테리어/생활서비스" 세 묶음으로 나눠 보여주기
// 위한 그룹핑(상호배타 규칙의 LAYER_GROUP_ZIPPALGO/ZIPTERIOR와는 별개로,
// 순수하게 UI 표시용).
const LAYER_PANEL_GROUPS: { label: string; keys: LayerKey[] }[] = [
  { label: "집팔고", keys: ["listings", "company_real_estate"] },
  { label: "집테리어", keys: ["interiorPortfolio", "company_interior"] },
  { label: "생활서비스", keys: ["company_mover", "company_cleaner"] },
];

// 레이어 토글 옆 색점 — 실제 지도 위 마커 색과 맞춘다(매물=빨강 핀,
// 시공사례=zpi-count-marker 배경색, 나머지는 COMPANY_LAYER_COLOR 그대로).
const LAYER_DOT_COLOR: Record<LayerKey, string> = {
  listings: "#bb1730",
  interiorPortfolio: "#21463b",
  company_real_estate: "#427cff",
  company_interior: "#21463b",
  company_mover: "#c98a2e",
  company_cleaner: "#2f9e6f",
};

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

// 매물/시공사례는 지도의 핵심 두 축이라 상호배타(위 두 그룹)일 뿐 아니라,
// 사용자가 실수로 둘 다 꺼서 지도가 텅 비는 상태를 만들 수 없도록 "최소
// 하나는 항상 켜져 있어야 함"도 강제한다(2026-08-27 사용자 요청).
const PRIMARY_LAYERS: ReadonlySet<LayerKey> = new Set(["listings", "interiorPortfolio"]);

// 지도 레이어 선택 저장 — 비로그인은 쿠키에, 로그인 사용자는 계정에
// 저장한다(handleSaveLayerPreference/useEffect 참고). 쿠키/서버 양쪽 다
// "레이어 키 콤마 목록" 문자열 하나로 주고받는다.
const MAP_LAYER_COOKIE = "zp_map_layers";
const MAP_LAYER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const KNOWN_LAYER_KEYS: ReadonlySet<string> = new Set(LAYER_DEFS.map((def) => def.key));

// 알 수 없는 키(예전 저장분에 남은 폐기된 레이어 등)는 걸러내고, 매물/
// 시공사례 중 하나도 안 남으면 그 저장값 자체를 무시한다(항상 최소 하나는
// 켜져 있어야 한다는 규칙을 저장/복원 양쪽에서 동일하게 지킴).
function sanitizeStoredLayers(raw: string[]): Set<LayerKey> | null {
  const filtered = raw.filter((key): key is LayerKey => KNOWN_LAYER_KEYS.has(key));
  if (!filtered.some((key) => PRIMARY_LAYERS.has(key))) return null;
  return new Set(filtered);
}

function readLayerCookie(): Set<LayerKey> | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)zp_map_layers=([^;]*)/);
  if (!match) return null;
  return sanitizeStoredLayers(decodeURIComponent(match[1]).split(",").filter(Boolean));
}

function writeLayerCookie(layers: Set<LayerKey>) {
  const csv = Array.from(layers).join(",");
  document.cookie = `${MAP_LAYER_COOKIE}=${encodeURIComponent(csv)}; path=/; max-age=${MAP_LAYER_COOKIE_MAX_AGE}`;
}

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

// 인테리어 시공사례 단지기본정보/포트폴리오 패널의 폭(InteriorComplexPanel/
// InteriorPortfolioPanel의 w-[28rem]과 반드시 동일해야 함) — 지도 위
// 절대 위치 오버레이라 지도 div 자체는 안 줄어드므로, 마커를 그냥
// setCenter만 하면 패널에 가려지거나 패널 바로 옆 애매한 자리에 온다.
const LEFT_PANEL_WIDTH_PX = 448;

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
  const { token } = useAuth();
  // 초기값 우선순위: 쿠키에 저장된 값(비로그인 때 저장한 것) > URL의
  // ?mode=interior > 기본값(매물). 로그인 사용자의 서버 저장값은 토큰이
  // 비동기로 확인된 뒤에만 알 수 있어서, 아래 별도 useEffect에서 도착하는
  // 대로 한 번 더 덮어쓴다(그새 사용자가 이미 조작했어도 "마지막에 로그인
  // 확인된 저장값"이 이기는 게 이 기능의 목적과 맞음).
  const initialLayers: Set<LayerKey> =
    readLayerCookie() ??
    (searchParams.get("mode") === "interior" ? new Set(["interiorPortfolio"]) : new Set(["listings"]));

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
  // 여러 단지가 뭉쳐진 클러스터 마커를 클릭했을 때 "이 마커에 포함된
  // 단지 목록" 1단계 화면에 쓸 목록 — 집테리어 모바일의
  // openClusterComplexSelect와 동일한 기능. null이면 안 뜸.
  const [clusterSelectItems, setClusterSelectItems] = useState<ZipteriorMapMarker[] | null>(null);
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
  const [searchResults, setSearchResults] = useState<ZipteriorSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // 집테리어 지도 컨트롤(줌/일반·위성/평·㎡/현재위치) 이식용 상태 — 전부
  // 집테리어 js/app.js의 동일 기능을 카카오맵 SDK 호출로 그대로 옮긴 것.
  const [areaUnit, setAreaUnit] = useState<AreaUnit>("m2");
  const [mapType, setMapType] = useState<"normal" | "satellite">("normal");
  const [isLocating, setIsLocating] = useState(false);
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [isSavingLayerPreference, setIsSavingLayerPreference] = useState(false);

  // 채팅 버튼 — 우측 지도 컨트롤 스택에 함께 둔다(햄버거는 이미 상단
  // 헤더(Header.tsx)에 같은 메뉴가 있어 지도 위에 따로 두지 않기로
  // 함). 채팅 자체는 아직 플랫폼에 없어 패널은 빈 상태만 보여주지만,
  // 클릭하면 실제로 패널이 열리고 닫혀야 하므로 toast 안내로 때우지
  // 않는다. unreadChatCount는 채팅 기능이 생기면 실제 안읽은 채팅방
  // 수로 채워질 자리 — 지금은 0으로 고정, 0이면 배지 자체를 숨긴다.
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadChatCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  // 로그인 사용자가 저장해둔 레이어 선택을 한 번 불러와 복원한다. 비로그인
  // 상태에서 시작한 초기값(쿠키 or 기본값)이 먼저 화면에 반짝 보일 수
  // 있지만, 로그인 확인 자체가 비동기(useAuth)라 어쩔 수 없다 — 서버에
  // 저장된 값이 있으면(빈 목록이 아니면) 이걸로 덮어쓴다. 세션당 한 번만
  // 시도하도록 ref로 막는다(토큰이 갱신돼도 재요청하지 않음).
  const appliedServerLayerPrefRef = useRef(false);
  useEffect(() => {
    if (!token || appliedServerLayerPrefRef.current) return;
    appliedServerLayerPrefRef.current = true;
    apiFetch<{ layers: string[] }>("/auth/me/map-layers", { token })
      .then((data) => {
        const sanitized = sanitizeStoredLayers(data.layers);
        if (sanitized) setActiveLayers(sanitized);
      })
      .catch(() => {
        // 저장된 적이 없거나 요청이 실패해도 지도는 이미 다른 기본값으로
        // 잘 떠 있으므로 조용히 무시한다.
      });
  }, [token]);

  // "설정 저장하기" — 로그인 상태면 계정에, 아니면 쿠키에 지금 켜진
  // 레이어 목록을 저장한다. 다음 방문 때 위 두 초기화 경로가 이 값을
  // 읽어 복원한다.
  const handleSaveLayerPreference = useCallback(async () => {
    setIsSavingLayerPreference(true);
    try {
      if (token) {
        await apiFetch("/auth/me/map-layers", {
          method: "PUT",
          token,
          body: { layers: Array.from(activeLayersRef.current) },
        });
      } else {
        writeLayerCookie(activeLayersRef.current);
      }
      setToast("지도 설정을 저장했어요.");
    } catch {
      setToast("설정 저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSavingLayerPreference(false);
    }
  }, [token]);

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

  // 단지 마커를 클릭했을 때 지도를 그 좌표로 이동시키되, 왼쪽 단지기본
  // 정보 패널(LEFT_PANEL_WIDTH_PX)에 가려지지 않도록 패널 폭의 절반만큼
  // 오른쪽으로 밀어서 "패널을 뺀 나머지 화면 영역"의 정중앙에 마커가
  // 오게 한다. 방법: 일단 target을 정중앙(true center)에 놓은 뒤,
  // container 기준으로 (정중앙 - 패널폭/2) 지점에 있던 좌표를 다시 구해
  // 그걸 새 중심으로 삼는다 — 그러면 target은 새 중심보다 패널폭/2만큼
  // 오른쪽(=원하는 자리)에 남는다. 원본 카카오맵 SDK API(Projection의
  // containerPointFromCoords/coordsFromContainerPoint)가 없는 극단적인
  // 경우엔 그냥 조용히 단순 setCenter로 폴백한다.
  const centerMapOnComplex = useCallback((lat: number, lng: number) => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;
    map.setCenter(new kakao.maps.LatLng(lat, lng));
    const container = mapContainerRef.current;
    const projection = map.getProjection?.();
    if (!container || typeof projection?.coordsFromContainerPoint !== "function") return;
    const offsetPx = LEFT_PANEL_WIDTH_PX / 2;
    const shiftedCenter = projection.coordsFromContainerPoint(
      new kakao.maps.Point(container.clientWidth / 2 - offsetPx, container.clientHeight / 2)
    );
    map.setCenter(shiftedCenter);
  }, []);

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
    setClusterSelectItems(null);
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
  //
  // "부챗살이 뜨는 경우도 있고 안 뜨는 경우도 있다"는 리포트의 원인 —
  // 이 함수를 호출하는 경로가 늘어나면서(검색 결과 선택, 클러스터
  // 목록에서 선택 등) 클릭 시점에 그 단지가 **화면에 개별 마커로 없는**
  // 경우(다른 단지와 뭉쳐 클러스터로 표시 중이거나, 아직 그 위치의
  // 마커를 한 번도 안 불러왔거나)가 흔해졌는데, 예전 코드는 그 경우
  // 그냥 `entry`가 없으니 조용히 포기하고 끝나서 패널만 열리고 지도
  // 위 부챗살은 영영 안 나타났다. 이제는 entry가 없으면 그 단지 좌표로
  // 지도를 이동시켜 클러스터를 풀어준다 — 그러면 idle 이벤트로
  // redrawInteriorClusters가 다시 돌면서(아래 그 함수 끝의 복원 로직)
  // 이 단지가 개별 마커로 그려지고, 캐시에 이미 있는 상세 정보로 부챗살
  // 상태를 자동 복원한다.
  const openInteriorComplex = useCallback(
    async (complexId: number) => {
      setSelectedComplexId((current) => {
        if (current != null && current !== complexId) collapseInteriorMarker(current);
        return complexId;
      });
      setSelectedArea(null);
      setSelectedPortfolio(null);
      setClusterSelectItems(null);

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
      // fetch가 걸리는 동안 사용자가 다른 단지를 또 클릭했으면 이 응답은
      // 버린다(오래된 응답이 방금 클릭한 단지를 덮어쓰지 않도록).
      if (selectedComplexIdRef.current !== complexId) return;

      const entry = interiorMarkerElementsRef.current.get(complexId);
      if (entry) {
        entry.el.innerHTML = buildFanMarkerHtml(complex, null);
        entry.overlay.setZIndex?.(10000);
        bindFanInteractions(entry.el, complex);
        centerMapOnComplex(complex.latitude, complex.longitude);
        return;
      }
      const map = mapRef.current;
      // 화면에 개별 마커가 없다는 건 다른 단지와 뭉쳐 클러스터로 표시
      // 중이었다는 뜻 — 확실하게 풀어내도록 고정된 줌(3)까지 당긴다
      // (현재 줌이 이미 더 가까우면 오히려 확대될 수 있어, 그럴 땐 현재
      // 줌을 유지).
      if (map) map.setLevel(Math.min(map.getLevel(), 3));
      centerMapOnComplex(complex.latitude, complex.longitude);
    },
    [collapseInteriorMarker, bindFanInteractions, centerMapOnComplex]
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
        // 집테리어 모바일과 동일하게, 여러 단지가 뭉친 마커는 확대 대신
        // "이 마커에 포함된 단지 목록"을 보여주고 사용자가 직접 골라
        // 단지기본정보로 넘어가게 한다(zoomToBoundsOnClick:false +
        // clusterclick → openClusterComplexSelect와 동일한 흐름).
        el.addEventListener("click", () => {
          closeInteriorPanels();
          setClusterSelectItems(bucket);
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
  }, [clearLayerMarkers, renderInteriorStandardMarker, bindFanInteractions, closeInteriorPanels]);

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
      // 매물/시공사례 중 켜져 있는 마지막 하나를 끄려는 시도는 막는다 —
      // 지도가 아예 텅 비는 상태를 만들 수 없게 하기 위함(2026-08-27).
      if (PRIMARY_LAYERS.has(layer) && activeLayersRef.current.has(layer)) {
        const other: LayerKey = layer === "listings" ? "interiorPortfolio" : "listings";
        if (!activeLayersRef.current.has(other)) {
          setToast("매물 또는 시공사례 중 최소 하나는 켜져 있어야 해요.");
          return;
        }
      }
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
          // 반대 그룹을 끄는 과정에서 매물/시공사례가 둘 다 꺼진 채로
          // 남을 수 있다(예: 매물은 이미 꺼둔 채로 "부동산 업체"만 새로
          // 켠 경우 — company_real_estate는 프라이머리가 아니라 위
          // 가드를 안 거치므로). 그럴 땐 지금 켠 레이어가 속한 그룹의
          // 프라이머리를 자동으로 같이 켜서 "최소 하나는 항상 켜져
          // 있어야 한다"를 어느 경로로도 어길 수 없게 한다.
          if (![...PRIMARY_LAYERS].some((primary) => next.has(primary))) {
            next.add(LAYER_GROUP_ZIPPALGO.has(layer) ? "listings" : "interiorPortfolio");
          }
        }
        return next;
      });
    },
    [deactivateLayer]
  );

  // 집테리어 js/app.js: document.querySelectorAll('[data-map-zoom]')...
  // map.zoomIn()/zoomOut() — 카카오 레벨은 낮을수록 확대이므로 부호가 반대.
  const handleZoom = useCallback((direction: "in" | "out") => {
    const map = mapRef.current;
    if (!map) return;
    map.setLevel(map.getLevel() + (direction === "in" ? -1 : 1));
  }, []);

  // 집테리어 js/app.js: [data-map-type] 클릭 시 satelliteMapLayer/
  // normalMapLayer 교체 — 카카오 SDK에서는 setMapTypeId로 동일하게 처리.
  const handleMapType = useCallback((type: "normal" | "satellite") => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;
    map.setMapTypeId(type === "satellite" ? kakao.maps.MapTypeId.HYBRID : kakao.maps.MapTypeId.ROADMAP);
    setMapType(type);
  }, []);

  // 집테리어 js/app.js: #locateControl 클릭 시 navigator.geolocation으로
  // 현재 위치를 받아 map.flyTo(..., 16)으로 이동 — 카카오 지도는 flyTo가
  // 없어 setLevel+setCenter로 동일한 효과를 낸다.
  // 기존 코드는 실패 시(권한 거부/타임아웃 등) 조용히 로딩 상태만 풀고
  // 아무 피드백도 없어서 "버튼이 안 먹는다"는 문의로 이어졌다 — 실패
  // 원인별로 토스트를 띄우도록 수정. 또한 enableHighAccuracy:true는
  // GPS가 없는 데스크톱 브라우저에서 위치 확인이 오래 걸리거나
  // 타임아웃으로 실패하는 경우가 있어(집테리어는 주로 모바일에서
  // 쓰여 이 문제가 덜 드러났을 뿐) false로 낮춰 Wi-Fi/IP 기반의 더 빠른
  // 위치 확인을 우선한다.
  const handleLocate = useCallback(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;
    if (!navigator.geolocation) {
      setToast("이 브라우저는 위치 확인을 지원하지 않습니다.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.setLevel(3);
        map.setCenter(new kakao.maps.LatLng(position.coords.latitude, position.coords.longitude));
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        console.error("[map] 현재 위치 확인 실패", error);
        if (error.code === error.PERMISSION_DENIED) {
          setToast("위치 접근이 차단되어 있습니다. 브라우저 주소창 옆 위치 권한을 허용해 주세요.");
        } else if (error.code === error.TIMEOUT) {
          setToast("위치 확인이 시간 초과됐습니다. 다시 시도해 주세요.");
        } else {
          setToast("현재 위치를 가져오지 못했습니다.");
        }
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  // 가운데 통합검색 — 집테리어 js/app.js의 updateSearch()와 동일하게
  // 180ms 디바운스 후 `/public/map/search`(여기선 그 프록시)를 호출해
  // 단지/업체/카카오 보강 장소(place)를 한 번에 받는다.
  useEffect(() => {
    const keyword = query.trim();
    if (!keyword) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      apiFetch<ZipteriorSearchOut>(`/integrations/zipterior/search?q=${encodeURIComponent(keyword)}&limit=10`)
        .then((data) => setSearchResults(data.items))
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  // 집테리어 js/app.js의 selectSearchResult와 동일한 분기(단지/업체/장소)를
  // 우리 레이어 구조에 맞게 옮긴 것 — 단지를 고르면 집테리어 레이어를 켜고
  // (상호배타 규칙에 따라 집팔고 레이어는 자동으로 꺼짐) 그 단지 정보
  // 패널을 연다. 마커가 아직 화면에 없어도 패널은 complexId 기준으로 열려
  // 문제없고, redrawInteriorClusters가 이후 그 마커를 그릴 때 부챗살
  // 상태를 알아서 복원한다(위 redrawInteriorClusters 참고).
  const handleSelectSearchResult = useCallback(
    (item: ZipteriorSearchItem) => {
      setQuery(item.title);
      setShowResults(false);
      const kakao = window.kakao;
      const map = mapRef.current;
      if (!kakao || !map || item.latitude == null || item.longitude == null) return;
      if (item.kind === "complex") {
        if (!activeLayersRef.current.has("interiorPortfolio")) toggleLayer("interiorPortfolio", true);
        // openInteriorComplex는 단지 상세를 fetch한 뒤에야 지도를 옮기므로
        // (네트워크 왕복만큼 늦게 반응) 검색 결과에 이미 있는 좌표로 먼저
        // 즉시 이동시킨다 — 패널 폭 보정은 centerMapOnComplex가 처리.
        map.setLevel(3);
        centerMapOnComplex(item.latitude, item.longitude);
        openInteriorComplex(Number(item.id));
      } else if (item.kind === "company") {
        if (!activeLayersRef.current.has("company_interior")) toggleLayer("company_interior", true);
        map.setLevel(4);
        map.setCenter(new kakao.maps.LatLng(item.latitude, item.longitude));
      } else {
        map.setLevel(3);
        map.setCenter(new kakao.maps.LatLng(item.latitude, item.longitude));
      }
    },
    [toggleLayer, openInteriorComplex, centerMapOnComplex]
  );

  const isLoading = loadingLayers.size > 0;

  // 우측 지도 컨트롤 스택 공통 버튼 스타일 — 배경은 항상 불투명 흰색으로
  // 고정(반투명이면 위성지도 위에서 버튼 자체가 묻혀 안 보이는 문제가
  // 있었음), 눌러서 켜진/전환된 상태는 배경 대신 글자·테두리 색만
  // 빨간색으로 강조한다.
  const controlButtonClass = (active: boolean) =>
    `flex h-11 w-11 items-center justify-center rounded-xl border bg-white shadow-md transition ${
      active
        ? "border-brand-red text-brand-red"
        : "border-line text-ink/80 hover:bg-soft"
    }`;

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <div ref={mapContainerRef} className="h-full w-full bg-soft" />

      {/* 가운데 통합검색 — 집테리어 지도의 검색창과 같은 위치(상단 중앙). */}
      <div className="absolute left-1/2 top-4 z-20 w-full max-w-xl -translate-x-1/2 px-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
            placeholder="지역명·지하철역·아파트·인테리어 업체를 검색하세요"
            className="w-full rounded-2xl border border-line bg-white/95 px-4 py-3 pr-11 text-sm shadow-md outline-none backdrop-blur focus:border-brand-green"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-brand-green">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <line x1="15.3" y1="15.3" x2="21" y2="21" />
            </svg>
          </span>
          {showResults && query.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 max-h-80 overflow-y-auto rounded-xl border border-line bg-white shadow-lg">
              {isSearching ? (
                <p className="px-4 py-3 text-sm text-muted">검색 중...</p>
              ) : searchResults.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted">검색 결과가 없습니다.</p>
              ) : (
                searchResults.map((item, index) => (
                  <button
                    key={`${item.kind}-${item.id || index}`}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-left last:border-b-0 hover:bg-soft"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{item.title}</span>
                      <span className="block truncate text-xs text-muted">{item.sub}</span>
                    </span>
                    <span
                      className={`shrink-0 text-[11px] font-bold ${
                        item.kind === "place" ? "text-muted" : "text-brand-red"
                      }`}
                    >
                      {item.tail}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 지도 보기 컨트롤 — 우측 세로 스택. 햄버거 메뉴는 상단 헤더
          (Header.tsx)에 이미 같은 메뉴가 있어 지도 위에 따로 두지 않고,
          채팅은 이 스택 맨 위로 옮겨왔다(집테리어처럼 검색창 옆 별도
          자리 대신, 다른 지도 컨트롤들과 함께 묶어 UX상 더 자연스러운
          위치). 그 아래로 사용 빈도가 높은 조작(확대·축소, 현재위치)을
          두고, 화면 표시 설정(일반·위성 전환, 평·㎡ 전환)을 그 아래에
          배치. 모든 버튼은 기본 흰색 → 켜지거나 전환되면 집테리어 마커와
          같은 계열의 파스텔 그린(controlButtonClass)으로 통일. */}
      <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setChatOpen((open) => !open)}
            aria-label="채팅 열기"
            aria-expanded={chatOpen}
            className={`relative ${controlButtonClass(chatOpen)}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 4.75h16v11.5H9l-5 3.5v-15Z" />
            </svg>
            {unreadChatCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[9px] font-bold text-white">
                {unreadChatCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex w-11 flex-col overflow-hidden rounded-xl border border-line bg-white/95 shadow-md backdrop-blur">
            <button type="button" onClick={() => handleZoom("in")} aria-label="지도 확대" className="h-11 text-xl font-bold text-ink/80 hover:bg-soft">
              +
            </button>
            <div className="border-t border-line" />
            <button type="button" onClick={() => handleZoom("out")} aria-label="지도 축소" className="h-11 text-xl font-bold text-ink/80 hover:bg-soft">
              −
            </button>
          </div>
          <button
            type="button"
            onClick={handleLocate}
            aria-label="현재 위치로 이동"
            className={controlButtonClass(isLocating)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="7" />
              <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleMapType(mapType === "normal" ? "satellite" : "normal")}
            aria-label={`지도 유형을 ${mapType === "normal" ? "위성" : "일반"} 화면으로 전환`}
            className={`${controlButtonClass(mapType === "satellite")} text-[11px] font-bold`}
          >
            {mapType === "normal" ? "일반" : "위성"}
          </button>
          <button
            type="button"
            onClick={() => setAreaUnit((unit) => (unit === "m2" ? "pyeong" : "m2"))}
            aria-label={`면적 단위를 ${areaUnit === "m2" ? "평" : "㎡"}로 전환`}
            className={`${controlButtonClass(areaUnit === "pyeong")} text-[11px] font-bold`}
          >
            {areaUnit === "m2" ? "㎡" : "평"}
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setLayerPanelOpen((open) => !open)}
            aria-label="지도 레이어 선택"
            aria-expanded={layerPanelOpen}
            className={`relative ${controlButtonClass(layerPanelOpen)}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 22 8.5 12 15 2 8.5 12 2" />
              <polyline points="2 15.5 12 22 22 15.5" />
              <polyline points="2 12 12 18.5 22 12" />
            </svg>
            {activeLayers.size > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-red text-[9px] font-bold text-white">
                {activeLayers.size}
              </span>
            )}
          </button>

          {layerPanelOpen && (
        <div className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <p className="text-sm font-bold text-ink">지도 레이어</p>
            <button
              type="button"
              onClick={() => setLayerPanelOpen(false)}
              aria-label="레이어 패널 닫기"
              className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-soft hover:text-ink"
            >
              ×
            </button>
          </div>

          <div className="flex flex-col divide-y divide-line">
            {LAYER_PANEL_GROUPS.map((group) => (
              <div key={group.label} className="px-4 py-3">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">{group.label}</p>
                <div className="flex flex-col gap-0.5">
                  {group.keys.map((key) => {
                    const layer = LAYER_DEFS.find((item) => item.key === key)!;
                    const active = activeLayers.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={!layer.available}
                        aria-pressed={active}
                        onClick={() => toggleLayer(key, layer.available)}
                        className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition ${
                          layer.available ? "hover:bg-soft" : "cursor-not-allowed opacity-45"
                        } ${active ? "bg-soft" : ""}`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: LAYER_DOT_COLOR[key] }}
                          />
                          <span className="truncate text-sm font-medium text-ink">{layer.label}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {!layer.available ? (
                            <span className="rounded-full bg-soft px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                              준비중
                            </span>
                          ) : active ? (
                            <span className="text-[11px] font-medium text-muted">
                              {unavailableLayers.has(key) ? "불러올 수 없음" : (layerCounts[key] ?? 0).toLocaleString()}
                            </span>
                          ) : null}
                          <span
                            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                              active ? "bg-brand-green" : "bg-line"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                active ? "translate-x-4" : "translate-x-0.5"
                              }`}
                            />
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {(activeLayers.has("interiorPortfolio") || activeLayers.has("listings")) && (
            <div className="flex flex-col gap-1.5 border-t border-line bg-soft/60 px-4 py-3">
              {activeLayers.has("interiorPortfolio") && (
                <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-brand-green">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green" />
                  초록색 마커는 실제 단지별 시공사례 수 입니다.
                </p>
              )}
              {activeLayers.has("listings") && (
                <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-brand-red">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red" />
                  붉은색 마커는 단지별 매물 수 입니다.
                </p>
              )}
            </div>
          )}

          {/* 지금 켜진 레이어 조합을 저장 — 로그인 상태면 계정에, 아니면
              쿠키에 저장해서 다음 방문 때 그대로 복원한다(2026-08-27). */}
          <div className="border-t border-line px-4 py-3">
            <button
              type="button"
              onClick={handleSaveLayerPreference}
              disabled={isSavingLayerPreference}
              className="w-full rounded-lg bg-brand-green px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-green/90 disabled:opacity-60"
            >
              {isSavingLayerPreference ? "저장 중..." : "이 레이어 설정 저장하기"}
            </button>
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
              {token
                ? "다음에 접속해도 이 조합으로 먼저 보여드려요."
                : "로그인하면 계정에 저장돼요. 지금은 이 브라우저에만 저장됩니다."}
            </p>
          </div>
        </div>
          )}
        </div>

        {isLoading && (
          <div className="rounded-xl border border-line bg-white/95 px-3 py-2 text-xs text-muted shadow-md">
            불러오는 중...
          </div>
        )}
      </div>

      {/* 인테리어 시공사례 패널들 — 집테리어(zipterior.kr)와 동일하게
          화면 왼쪽에서 열리고, 단지기본정보 옆에 포트폴리오 상세가
          나란히(겹치지 않고) 열린다. 클러스터 선택 목록과 단지기본정보는
          같은 자리를 공유하는 1단계/2단계 흐름(둘 다 selectedComplexId가
          null일 때만 클러스터 목록이 보임)이고, 포트폴리오 상세는 그
          오른쪽에 추가로 붙는 세 번째 칸. */}
      <div className="absolute left-0 top-0 z-20 flex h-full">
        {activeLayers.has("interiorPortfolio") && clusterSelectItems && selectedComplexId == null && (
          <div className="flex h-full w-[28rem] flex-shrink-0 flex-col overflow-hidden border-r border-line bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="text-xs font-bold text-brand-green">1단계</p>
                <p className="text-sm font-bold text-ink">아파트 단지를 선택해 주세요</p>
              </div>
              <button
                type="button"
                onClick={() => setClusterSelectItems(null)}
                aria-label="닫기"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-muted transition hover:bg-soft hover:text-ink"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="mb-3 text-xs text-muted">
                이 마커에 포함된 아파트 단지 {clusterSelectItems.length}곳입니다.
              </p>
              <div className="flex flex-col gap-2">
                {clusterSelectItems.map((marker) => (
                  <button
                    key={marker.id}
                    type="button"
                    onClick={() => {
                      setClusterSelectItems(null);
                      // openInteriorComplex는 단지 상세를 fetch한 뒤에야
                      // 지도를 옮기므로(네트워크 왕복만큼 늦게 반응) 목록에
                      // 이미 있는 좌표로 먼저 즉시 이동시켜 "눌렀는데 지도가
                      // 안 움직인다"는 체감을 없앤다. 클러스터를 확실히
                      // 풀어내야 하니 줌도 고정된 값(3)으로 당겨준다.
                      const map = mapRef.current;
                      if (map) map.setLevel(3);
                      centerMapOnComplex(marker.latitude, marker.longitude);
                      openInteriorComplex(marker.id);
                    }}
                    className="flex items-center justify-between gap-3 rounded-xl bg-soft px-4 py-3 text-left transition hover:bg-brand-green/10"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{marker.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {[marker.sido, marker.sigungu].filter(Boolean).join(" ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-brand-green">{marker.portfolio_count}건</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeLayers.has("interiorPortfolio") && selectedComplexId != null && (
          <InteriorComplexPanel
            complexId={selectedComplexId}
            selectedArea={selectedArea}
            onSelectArea={setSelectedArea}
            onClose={closeInteriorPanels}
            areaUnit={areaUnit}
            onOpenPortfolio={setSelectedPortfolio}
          />
        )}
        {selectedPortfolio && (
          <InteriorPortfolioPanel
            portfolioId={selectedPortfolio.id}
            onClose={() => setSelectedPortfolio(null)}
            areaUnit={areaUnit}
          />
        )}
        {activeLayers.has("interiorPortfolio") && (
          <NearbyPortfolioWidget onOpenPortfolio={setSelectedPortfolio} />
        )}
      </div>

      {chatOpen && (
        <div className="absolute right-0 top-0 z-30 flex h-full w-full max-w-sm flex-col overflow-hidden border-l border-line bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <p className="text-sm font-bold text-ink">채팅</p>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label="채팅 닫기"
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-muted transition hover:bg-soft hover:text-ink"
            >
              ×
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 4.75h16v11.5H9l-5 3.5v-15Z" />
              </svg>
            </span>
            <p className="text-sm font-semibold text-ink">아직 채팅 내역이 없어요</p>
            <p className="text-xs text-muted">매물·업체 상세에서 문의를 시작하면 여기에 표시됩니다.</p>
          </div>
        </div>
      )}

      {toast && (
        <div className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-ink/90 px-4 py-2 text-xs font-medium text-white shadow-lg">
          {toast}
        </div>
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
