"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ListingMapMarker, PurchaseRequest } from "@/lib/types";

// 왼쪽 아이콘 레일 + "홈" 탭 콘텐츠 — 지도 화면에 처음 들어왔을 때
// 매물 지도만 덩그러니 보이는 대신, 집팔고360이 매도→매수→인테리어→
// 이사·정착까지 순환하는 "부동산 사이클" 플랫폼이라는 걸 한눈에
// 보여주기 위한 사이드바.
//
// 2026-08-28(밤): "지금 바로 시작하기" CTA와 매물/구매의뢰/집서비스 탭을
// 정적 자리표시 데이터 대신 실제 API/실제 페이지로 연결했다.
// - 매물 목록: GET /listings/map/markers (공개, 인증 불필요)
// - 구매의뢰: GET /purchase-requests/mine (로그인 필요)
// - CTA 4개는 팝업 폼이 아니라 이미 완성돼 있는 실제 등록 페이지로 이동
//   (매도→/zippalgo/new, 매수→/zipsago/new, 인테리어→/zipterior,
//   이사→/zipservice/new) — 컴팩트한 팝업 안에 ComplexTypePicker 같은
//   실제 폼 로직을 다시 구현하는 대신 이미 검증된 페이지를 재사용.
// - 집서비스 "예약 내역"과 "이번 주 시황"은 그걸 뒷받침할 실제 API가
//   없어서(조회수 트래킹/시세 통계 백엔드 없음) 그대로 들어냈다 — 없는
//   데이터를 있는 것처럼 보여주지 않기 위함. 매물/구매의뢰 탭은 데이터가
//   0건이어도 정직하게 빈 상태를 보여준다.
type Tab = "home" | "listing" | "buyreq" | "service" | "menu";
// "map" 탭은 별도 화면이 아니라 "패널을 접어 지도를 전체 폭으로"이므로
// Tab 유니온엔 넣지 않고 패널 숨김 여부로만 다룬다.
type Stage = "sell" | "buy" | "interior" | "move" | null;

const houseIcon = (
  <>
    <path d="M3 11l9-7 9 7" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M5 10v9a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1v-9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
);
const listingIcon = (
  <>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M4 9h16M9 4v16" strokeLinecap="round" />
  </>
);
const searchIcon = (
  <>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.3 15.3L21 21" strokeLinecap="round" />
  </>
);
const rollerIcon = (
  <>
    <rect x="4" y="4" width="11" height="6" rx="1.5" />
    <rect x="7.5" y="10" width="4" height="9" rx="1.2" />
  </>
);
const boxIcon = (
  <>
    <path d="M4 9l3-5h10l3 5" strokeLinejoin="round" />
    <rect x="4" y="9" width="16" height="11" rx="1.5" />
    <path d="M12 9v11" />
  </>
);
const mapIcon = (
  <>
    <path d="M9 4l-6 2.2v13.6L9 17.6l6 2.2 6-2.2V4.2L15 6.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 4v13.6M15 6.4V20" strokeLinecap="round" />
  </>
);
const menuIcon = <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />;
const chevronRight = <path d="M7.5 4.5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />;
const checkIcon = <path d="M3.5 8.2l2.8 2.8 6-6.6" strokeLinecap="round" strokeLinejoin="round" />;

function Svg({
  children,
  size = 18,
  stroke = "currentColor",
  strokeWidth = 1.7,
  fill = "none",
}: {
  children: React.ReactNode;
  size?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth={strokeWidth}>
      {children}
    </svg>
  );
}

const STAGE_META: Record<
  NonNullable<Stage>,
  { label: string; sub: string; icon: React.ReactNode; color: string; soft: string; route: string; buttonLabel: string; desc: string }
> = {
  sell: {
    label: "매도",
    sub: "집팔고",
    icon: houseIcon,
    color: "var(--color-brand-red)",
    soft: "var(--color-brand-red-soft)",
    route: "/zippalgo/new",
    buttonLabel: "매물 등록하기",
    desc: "등록비 0원 · 더블베네핏으로 돌려받는 매도",
  },
  buy: {
    label: "매수",
    sub: "집사고",
    icon: searchIcon,
    color: "var(--color-brand-blue)",
    soft: "#eaf1ff",
    route: "/zipsago/new",
    buttonLabel: "구매의뢰 남기기",
    desc: "10초만에 구매의뢰 남기고 딱 맞는 집 찾기",
  },
  interior: {
    label: "인테리어",
    sub: "집테리어",
    icon: rollerIcon,
    color: "var(--color-brand-green)",
    soft: "var(--color-brand-green-soft)",
    route: "/zipterior",
    buttonLabel: "시공사례 보기",
    desc: "같은 단지 시공사례 보고 무료 견적문의",
  },
  move: {
    label: "이사·정착",
    sub: "집서비스",
    icon: boxIcon,
    color: "#b8843a",
    soft: "#fbf1e2",
    route: "/zipservice/new",
    buttonLabel: "집서비스 예약",
    desc: "집이사 · 집청소, 이사 날짜 맞춰 한번에 예약",
  },
};

// 지도 마커 조회와 동일한 엔드포인트를 전국 범위로 넓게 불러서
// "매물" 탭 목록과 홈 탭의 "최근 등록된 매물" 미리보기에 함께 쓴다.
const KOREA_BOUNDS = { north: 38.7, south: 33.0, east: 132.0, west: 124.5 };

export default function HomeSidebar() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("home");
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [stage, setStage] = useState<Stage>(null);

  const [listings, setListings] = useState<ListingMapMarker[] | null>(null);
  const [listingsError, setListingsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ListingMapMarker[]>(
      `/listings/map/markers?north=${KOREA_BOUNDS.north}&south=${KOREA_BOUNDS.south}&east=${KOREA_BOUNDS.east}&west=${KOREA_BOUNDS.west}&limit=12`
    )
      .then((data) => {
        if (!cancelled) setListings(data);
      })
      .catch(() => {
        if (!cancelled) setListingsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleStage(next: NonNullable<Stage>) {
    setStage((cur) => (cur === next ? null : next));
  }
  function goToStage(next: NonNullable<Stage>) {
    router.push(STAGE_META[next].route);
  }
  function selectTab(next: Tab | "map") {
    if (next === "map") {
      setPanelCollapsed(true);
      return;
    }
    setPanelCollapsed(false);
    setTab(next);
  }

  return (
    <div className="flex h-full flex-shrink-0">
      <IconRail activeTab={panelCollapsed ? "map" : tab} onSelect={selectTab} />
      {!panelCollapsed && (
        <div className="flex h-full w-[22.5rem] flex-shrink-0 flex-col overflow-hidden border-r border-line bg-white">
          {tab === "home" && (
            <HomePanel
              stage={stage}
              toggleStage={toggleStage}
              goToStage={goToStage}
              listings={listings}
              listingsError={listingsError}
            />
          )}
          {tab === "listing" && <ListingPanel listings={listings} listingsError={listingsError} />}
          {tab === "buyreq" && <BuyReqPanel />}
          {tab === "service" && <ServicePanel />}
          {tab === "menu" && <MenuPanel />}
        </div>
      )}
    </div>
  );
}

function IconRail({
  activeTab,
  onSelect,
}: {
  activeTab: Tab | "map";
  onSelect: (tab: Tab | "map") => void;
}) {
  const items: { key: Tab | "map"; label: string; icon: React.ReactNode }[] = [
    { key: "home", label: "홈", icon: houseIcon },
    { key: "listing", label: "매물", icon: listingIcon },
    { key: "buyreq", label: "구매의뢰", icon: searchIcon },
    { key: "service", label: "집서비스", icon: boxIcon },
    { key: "map", label: "지도", icon: mapIcon },
  ];

  return (
    <div className="flex w-[4.75rem] flex-shrink-0 flex-col items-center gap-1 border-r border-line bg-brand-red-soft py-5">
      {items.map((item) => (
        <RailButton key={item.key} active={activeTab === item.key} label={item.label} icon={item.icon} onClick={() => onSelect(item.key)} />
      ))}
      <div className="mt-auto">
        <RailButton active={activeTab === "menu"} label="메뉴" icon={menuIcon} onClick={() => onSelect("menu")} />
      </div>
    </div>
  );
}

function RailButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-[3.75rem] flex-col items-center gap-1 whitespace-nowrap rounded-[14px] px-1.5 py-2 transition ${
        active ? "bg-brand-red text-white shadow-[0_4px_10px_rgba(187,23,48,0.28)]" : "text-muted hover:bg-white/60"
      }`}
    >
      <Svg size={22} strokeWidth={1.8} stroke={active ? "#fff" : "#777e79"}>
        {icon}
      </Svg>
      <span className={`text-[10.5px] ${active ? "font-bold text-white" : "font-medium text-muted"}`}>{label}</span>
    </button>
  );
}

function SectionDivider() {
  return <div className="mx-[1.375rem] h-px bg-line" />;
}

function StageBadge({ visible, color, soft }: { visible: boolean; color: string; soft: string }) {
  if (!visible) return null;
  return (
    <span
      className="mb-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ color, background: soft }}
    >
      <Svg size={8} stroke={color} strokeWidth={2.6}>
        {checkIcon}
      </Svg>
      지금 내 단계
    </span>
  );
}

function formatPrice(won: number) {
  const eok = won / 100_000_000;
  return eok >= 1 ? `${eok.toFixed(eok % 1 === 0 ? 0 : 1)}억` : `${Math.round(won / 10_000)}만원`;
}

function HomePanel({
  stage,
  toggleStage,
  goToStage,
  listings,
  listingsError,
}: {
  stage: Stage;
  toggleStage: (s: NonNullable<Stage>) => void;
  goToStage: (s: NonNullable<Stage>) => void;
  listings: ListingMapMarker[] | null;
  listingsError: boolean;
}) {
  const recentListings = (listings ?? []).slice(0, 3);

  return (
    <div className="scrollbar-hide flex-1 overflow-y-auto">
      {/* 검색 */}
      <div className="px-[1.375rem] pb-5 pt-6">
        <p className="mb-3 text-[13px] text-muted">매물부터 인테리어까지, 지도에서 한눈에</p>
        <div className="flex items-center gap-2 rounded-2xl border border-line px-3.5 py-2.5">
          <Svg size={16} stroke="#777e79" strokeWidth={2}>
            {searchIcon}
          </Svg>
          <span className="text-[13px] text-muted">지역명·아파트·인테리어 업체를 검색하세요</span>
        </div>
      </div>

      <SectionDivider />

      {/* 부동산 사이클 다이어그램 */}
      <div className="px-[1.375rem] pb-1.5 pt-5">
        <p className="text-[15px] font-extrabold leading-snug text-ink">집 한 채, 사고팔고 꾸미고 이사까지</p>
        <p className="mb-[18px] mt-1 text-xs text-muted">집팔고360 하나로 순환합니다</p>

        <div className="relative pb-2">
          <div className="flex items-start justify-between">
            {(["sell", "buy", "interior", "move"] as const).map((key) => {
              const meta = STAGE_META[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleStage(key)}
                  className="relative flex w-[3.75rem] flex-col items-center gap-1.5"
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ background: meta.soft }}
                  >
                    <Svg size={18} stroke={meta.color}>
                      {meta.icon}
                    </Svg>
                  </span>
                  {stage === key && (
                    <span
                      className="absolute right-1.5 top-[-2px] flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 border-white"
                      style={{ background: meta.color }}
                    >
                      <Svg size={8} stroke="#fff" strokeWidth={2.6}>
                        {checkIcon}
                      </Svg>
                    </span>
                  )}
                  <span className="text-[11px] font-bold text-ink">{meta.label}</span>
                  <span className="text-[9px] text-muted">{meta.sub}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-center text-[9.5px] text-muted">터치해서 지금 내 단계를 선택해보세요</p>
        </div>
      </div>

      <SectionDivider />

      {/* 다음 액션 */}
      <div className="px-[1.375rem] pb-5 pt-[18px]">
        <p className="mb-2.5 text-[13px] font-semibold text-ink">지금 바로 시작하기</p>

        {stage === null && (
          <div className="grid grid-cols-2 gap-2">
            {(["sell", "buy", "interior", "move"] as const).map((key) => {
              const meta = STAGE_META[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => goToStage(key)}
                  className="flex flex-col gap-2.5 rounded-xl border border-line p-3 text-left transition hover:border-brand-green/40"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: meta.soft }}>
                    <Svg size={15} stroke={meta.color}>
                      {meta.icon}
                    </Svg>
                  </span>
                  <span className="text-[11.5px] font-bold leading-tight text-ink">{meta.buttonLabel}</span>
                </button>
              );
            })}
          </div>
        )}

        {stage !== null && <NextActionCard stage={stage} onClick={() => goToStage(stage)} />}
      </div>

      <SectionDivider />

      {/* 매물 거래 안전 (매도 단계) */}
      <div className="px-[1.375rem] py-5">
        <StageBadge visible={stage === "sell"} color="var(--color-brand-red)" soft="var(--color-brand-red-soft)" />
        <p className="mb-3.5 text-[13px] font-semibold text-ink">매물 거래, 안전하게</p>
        <div className="grid grid-cols-5 gap-1">
          {[
            { label: "등기변동\n알림", icon: <><path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z" strokeLinejoin="round" /><path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" /></> },
            { label: "보증금\n안전확인", icon: <><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></> },
            { label: "실거래가\n비교", icon: <><path d="M4 19h16M6 19V9l5-4 5 4v10" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 19v-5h4v5" strokeLinecap="round" /></> },
            { label: "더블베네핏\n정산확인", icon: <><rect x="3.5" y="9" width="17" height="11" rx="1.4" strokeLinejoin="round" /><path d="M3.5 13h17M12 9v11" /><path d="M12 9C9 9 8 7.5 8 6a2 2 0 1 1 4 3zM12 9c3 0 4-1.5 4-3a2 2 0 1 0-4 3z" strokeLinejoin="round" /></> },
            { label: "인증 중개사\n확인", icon: <><circle cx="8" cy="8" r="4" /><path d="M11 11l9 9M17 17l2-2M14 14l2-2" strokeLinecap="round" /></> },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1.5">
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-soft">
                <Svg size={17} stroke="#414741" strokeWidth={1.5}>
                  {item.icon}
                </Svg>
              </span>
              <span className="whitespace-pre-line text-center text-[10px] leading-tight text-muted">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <SectionDivider />

      {/* 이 근처 시공사례 (인테리어 단계) */}
      <div className="px-[1.375rem] py-5">
        <StageBadge visible={stage === "interior"} color="var(--color-brand-green)" soft="var(--color-brand-green-soft)" />
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-ink">시공사례 · 견적문의</p>
          <a href="/zipterior" className="text-[11px] font-semibold text-brand-green">
            더보기 ›
          </a>
        </div>
        <a
          href="/zipterior"
          className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3.5 transition hover:border-brand-green/40"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px]" style={{ background: "var(--color-brand-green-soft)" }}>
            <Svg size={19} stroke="var(--color-brand-green)" strokeWidth={1.6}>
              {rollerIcon}
            </Svg>
          </span>
          <span className="flex-1">
            <span className="block text-xs font-semibold text-ink">집테리어에서 시공사례 둘러보기</span>
            <span className="mt-0.5 block text-[11px] text-muted">같은 단지 시공사례 · 무료 견적문의</span>
          </span>
          <Svg size={14} stroke="#414741" strokeWidth={2}>
            {chevronRight}
          </Svg>
        </a>
      </div>

      <SectionDivider />

      {/* 집서비스 (이사 단계) */}
      <div className="px-[1.375rem] py-5">
        <StageBadge visible={stage === "move"} color="#b8843a" soft="#fbf1e2" />
        <button
          type="button"
          onClick={() => goToStage("move")}
          className="flex w-full items-center gap-3 rounded-2xl border border-line px-4 py-3.5 text-left"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px]" style={{ background: "#fbf1e2" }}>
            <Svg size={19} stroke="#b8843a" strokeWidth={1.6}>
              {boxIcon}
            </Svg>
          </span>
          <span className="flex-1">
            <span className="block text-xs font-semibold text-ink">이사 앞두고 계세요?</span>
            <span className="mt-0.5 block text-[11px] text-muted">집이사 · 집청소 한번에 예약</span>
          </span>
          <Svg size={14} stroke="#414741" strokeWidth={2}>
            {chevronRight}
          </Svg>
        </button>
      </div>

      <SectionDivider />

      {/* 참고 정보 — 실제 등록된 매물 중 최근 것 미리보기 (부가 정보라 절제된 톤) */}
      <div className="px-[1.375rem] pb-[18px] pt-1">
        <p className="mb-2 text-[11.5px] font-semibold text-muted">최근 등록된 매물</p>
        {listingsError && <p className="text-[11px] text-muted">매물 정보를 불러오지 못했습니다.</p>}
        {!listingsError && listings === null && <p className="text-[11px] text-muted">불러오는 중...</p>}
        {!listingsError && listings !== null && recentListings.length === 0 && (
          <p className="text-[11px] text-muted">아직 등록된 매물이 없어요.</p>
        )}
        {recentListings.length > 0 && (
          <div className="flex flex-col">
            {recentListings.map((item, i) => (
              <a
                key={item.id}
                href={`/zippalgo/listings/${item.id}`}
                className="flex items-center gap-2 py-1.5"
              >
                <span className="w-3 text-[11px] font-bold text-muted">{i + 1}</span>
                <span className="flex-1 truncate text-[11.5px] text-ink">{item.complex_name}</span>
                <span className="text-[10px] font-semibold text-brand-red">{formatPrice(item.asking_price)}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      <SectionDivider />

      {/* 이용 후기 */}
      <div className="px-[1.375rem] pb-6 pt-5">
        <p className="mb-3 text-[13px] font-semibold text-ink">이용 후기</p>
        <div className="flex flex-col gap-2">
          <div className="rounded-2xl border border-line bg-soft p-3.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-ink">이용자 kj****</span>
              <span className="text-[11px] text-muted">· 집팔고→집사고→집테리어</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              살던 집은 집팔고로 팔고, 이사 갈 집은 집사고로 찾고, 새 집은 집테리어로 꾸몄어요. 한 곳에서 다 되니까
              편하더라고요.
            </p>
          </div>
          <div className="rounded-2xl border border-line p-3.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-ink">판매자 wj****</span>
              <span className="text-[11px] text-muted">· 역삼푸르지오아파트</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              중개사 세 곳이 열람해서 금방 팔렸어요. 수수료 대신 현금까지 받았네요.
            </p>
          </div>
          <div className="rounded-2xl border border-line p-3.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-ink">고객 xu****</span>
              <span className="text-[11px] text-muted">· 한일유앤아이 시공사례</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              같은 단지 시공사례를 지도에서 바로 보니까 견적 비교가 쉬웠어요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function NextActionCard({ stage, onClick }: { stage: NonNullable<Stage>; onClick: () => void }) {
  const meta = STAGE_META[stage];
  return (
    <div className="flex items-center gap-3 rounded-2xl p-4" style={{ background: meta.soft }}>
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white">
        <Svg size={20} stroke={meta.color}>
          {meta.icon}
        </Svg>
      </span>
      <div className="flex-1">
        <p className="text-xs font-bold leading-snug text-ink">{meta.desc}</p>
        <button
          type="button"
          onClick={onClick}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-white"
          style={{ background: meta.color }}
        >
          {meta.buttonLabel}
          <Svg size={11} stroke="#fff" strokeWidth={2.4}>
            {chevronRight}
          </Svg>
        </button>
      </div>
    </div>
  );
}

function ListingPanel({
  listings,
  listingsError,
}: {
  listings: ListingMapMarker[] | null;
  listingsError: boolean;
}) {
  return (
    <div className="scrollbar-hide flex-1 overflow-y-auto">
      <div className="px-[1.375rem] pb-4 pt-6">
        <p className="text-[15px] font-extrabold text-ink">매물</p>
        <p className="mt-1 text-xs text-muted">
          {listingsError ? "매물 정보를 불러오지 못했습니다" : listings === null ? "불러오는 중..." : `전국 매물 ${listings.length}건`}
        </p>
      </div>
      <SectionDivider />
      <div className="flex flex-col gap-2.5 px-[1.375rem] py-4">
        {listingsError && <p className="text-xs text-muted">매물 정보를 불러오지 못했습니다.</p>}
        {!listingsError && listings !== null && listings.length === 0 && (
          <p className="text-xs text-muted">아직 등록된 매물이 없어요.</p>
        )}
        {(listings ?? []).map((item) => (
          <a
            key={item.id}
            href={`/zippalgo/listings/${item.id}`}
            className="flex gap-2.5 rounded-2xl border border-line p-3 transition hover:border-brand-red/40"
          >
            <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[10px] bg-soft">
              <Svg size={26} stroke="#9aa19b" strokeWidth={1.6}>
                {houseIcon}
              </Svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-bold text-ink">{item.complex_name}</p>
              <p className="mt-0.5 text-[11px] text-muted">
                {item.sido} {item.sigungu ?? ""}
              </p>
              <p className="mt-1 text-[13.5px] font-extrabold text-brand-red">{formatPrice(item.asking_price)}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

const PURCHASE_STATUS_META: Record<PurchaseRequest["status"], { label: string; className: string }> = {
  submitted: { label: "접수됨", className: "text-muted bg-soft" },
  in_progress: { label: "진행중", className: "text-brand-blue bg-[#eaf1ff]" },
  matched: { label: "매칭완료", className: "text-[#1f9d55] bg-[#e8f7ee]" },
  closed: { label: "종료", className: "text-muted bg-soft" },
};

function BuyReqPanel() {
  const { token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<PurchaseRequest[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiFetch<PurchaseRequest[]>("/purchase-requests/mine", { token })
      .then((data) => {
        if (!cancelled) setRequests(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="scrollbar-hide flex-1 overflow-y-auto">
      <div className="px-[1.375rem] pb-4 pt-6">
        <p className="text-[15px] font-extrabold text-ink">내 구매의뢰</p>
        <p className="mt-1 text-xs text-muted">
          {token ? (requests === null ? "불러오는 중..." : `남긴 구매의뢰 ${requests.length}건`) : "로그인하면 볼 수 있어요"}
        </p>
      </div>
      <div className="px-[1.375rem] pb-4">
        <button
          type="button"
          onClick={() => router.push("/zipsago/new")}
          className="w-full rounded-full bg-brand-blue py-2.5 text-center text-[12.5px] font-bold text-white"
        >
          + 새 구매의뢰 남기기
        </button>
      </div>
      <SectionDivider />
      <div className="flex flex-col gap-2.5 px-[1.375rem] py-4">
        {!authLoading && !token && (
          <div className="rounded-2xl border border-line px-4 py-3.5 text-center">
            <p className="text-xs text-muted">로그인 후 내가 남긴 구매의뢰를 확인할 수 있어요.</p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-3 rounded-full bg-brand-blue px-4 py-2 text-[12px] font-bold text-white"
            >
              로그인하기
            </button>
          </div>
        )}
        {token && error && <p className="text-xs text-muted">구매의뢰 정보를 불러오지 못했습니다.</p>}
        {token && !error && requests !== null && requests.length === 0 && (
          <p className="text-xs text-muted">아직 남긴 구매의뢰가 없어요.</p>
        )}
        {(requests ?? []).map((item) => {
          const statusMeta = PURCHASE_STATUS_META[item.status];
          return (
            <div key={item.id} className="rounded-2xl border border-line px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12.5px] font-bold text-ink">
                  {item.sido} {item.sigungu}
                  {item.desired_budget_min || item.desired_budget_max
                    ? ` · ${item.desired_budget_min ? formatPrice(item.desired_budget_min) : ""}${
                        item.desired_budget_min && item.desired_budget_max ? "~" : ""
                      }${item.desired_budget_max ? formatPrice(item.desired_budget_max) : ""}`
                    : ""}
                </p>
                <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${statusMeta.className}`}>
                  {statusMeta.label}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                {new Date(item.created_at).toLocaleDateString("ko-KR")} 접수 · {item.title}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ServicePanel() {
  const router = useRouter();
  return (
    <div className="scrollbar-hide flex-1 overflow-y-auto">
      <div className="px-[1.375rem] pb-4 pt-6">
        <p className="text-[15px] font-extrabold text-ink">집서비스</p>
        <p className="mt-1 text-xs text-muted">이사부터 청소까지 한번에</p>
      </div>
      <div className="flex gap-2 px-[1.375rem] pb-4">
        <button
          type="button"
          onClick={() => router.push("/zipservice/new?category=moving")}
          className="flex-1 rounded-2xl border border-line p-3.5 text-center transition hover:border-[#b8843a]/50"
        >
          <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: "#fbf1e2" }}>
            <Svg size={18} stroke="#b8843a" strokeWidth={1.6}>
              {boxIcon}
            </Svg>
          </span>
          <p className="mt-2 text-xs font-bold text-ink">집이사</p>
        </button>
        <button
          type="button"
          onClick={() => router.push("/zipservice/new?category=living_cleaning")}
          className="flex-1 rounded-2xl border border-line p-3.5 text-center transition hover:border-[#b8843a]/50"
        >
          <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: "#fbf1e2" }}>
            <Svg size={18} stroke="#b8843a" strokeWidth={1.6}>
              <circle cx="12" cy="12" r="3" />
              <path
                d="M12 3v4M12 17v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8"
                strokeLinecap="round"
              />
            </Svg>
          </span>
          <p className="mt-2 text-xs font-bold text-ink">집청소</p>
        </button>
      </div>
      <SectionDivider />
      <div className="px-[1.375rem] py-4">
        <button
          type="button"
          onClick={() => router.push("/zipservice")}
          className="flex w-full items-center justify-between rounded-2xl border border-line px-4 py-3.5 text-left"
        >
          <span className="text-[12.5px] font-semibold text-ink">전체 집서비스 업체 둘러보기</span>
          <Svg size={12} stroke="#9aa19b" strokeWidth={2}>
            {chevronRight}
          </Svg>
        </button>
      </div>
    </div>
  );
}

function MenuPanel() {
  const router = useRouter();
  const items: { label: string; icon: React.ReactNode; href: string }[] = [
    {
      label: "마이페이지",
      href: "/mypage",
      icon: (
        <>
          <circle cx="12" cy="8" r="3.6" />
          <path d="M4.5 20c1.5-4 4.5-6 7.5-6s6 2 7.5 6" strokeLinecap="round" />
        </>
      ),
    },
    { label: "파트너센터", href: "/partners", icon: houseIcon },
    {
      label: "로그인 · 회원가입",
      href: "/login",
      icon: (
        <>
          <rect x="4" y="9" width="9" height="6" rx="1.5" />
          <path d="M6.5 9V6.5a2.5 2.5 0 0 1 5 0V9" strokeLinecap="round" />
          <circle cx="17" cy="12" r="3.4" />
          <path d="M17 12v2.4M17 9.6v.01" strokeLinecap="round" />
        </>
      ),
    },
  ];
  return (
    <div className="scrollbar-hide flex-1 overflow-y-auto">
      <div className="px-[1.375rem] pb-2 pt-6">
        <p className="text-[15px] font-extrabold text-ink">메뉴</p>
      </div>
      <div className="px-[1.375rem]">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => router.push(item.href)}
            className="flex w-full items-center gap-3 border-b border-line py-3.5 text-left"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-soft">
              <Svg size={16} stroke="#414741" strokeWidth={1.6}>
                {item.icon}
              </Svg>
            </span>
            <span className="flex-1 text-[13px] font-semibold text-ink">{item.label}</span>
            <Svg size={12} stroke="#9aa19b" strokeWidth={2}>
              {chevronRight}
            </Svg>
          </button>
        ))}
      </div>
    </div>
  );
}
