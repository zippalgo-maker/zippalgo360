"use client";

import { useState } from "react";

// 왼쪽 아이콘 레일 + "홈" 탭 콘텐츠 — 지도 화면에 처음 들어왔을 때
// 매물 지도만 덩그러니 보이는 대신, 집팔고360이 매도→매수→인테리어→
// 이사·정착까지 순환하는 "부동산 사이클" 플랫폼이라는 걸 한눈에
// 보여주기 위한 사이드바. Design Canvas 목업(2026-08-28)을 그대로
// 반영한 1차 버전 — 매물/구매의뢰/집서비스 탭과 시황·랭킹은 아직
// 실데이터가 아니라 자리표시용 정적 콘텐츠다. 실거래/랭킹 API가
// 붙기 전까지는 이 정적 값을 유지한다.
type Tab = "home" | "listing" | "buyreq" | "service" | "menu";
// "map" 탭은 별도 화면이 아니라 "패널을 접어 지도를 전체 폭으로"이므로
// Tab 유니온엔 넣지 않고 패널 숨김 여부로만 다룬다.
type Stage = "sell" | "buy" | "interior" | "move" | null;
type FlowType = "sell" | "buy" | "interior" | "move" | null;
type FlowStep = "form" | "done";

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
  { label: string; sub: string; icon: React.ReactNode; color: string; soft: string }
> = {
  sell: { label: "매도", sub: "집팔고", icon: houseIcon, color: "var(--color-brand-red)", soft: "var(--color-brand-red-soft)" },
  buy: { label: "매수", sub: "집사고", icon: searchIcon, color: "var(--color-brand-blue)", soft: "#eaf1ff" },
  interior: { label: "인테리어", sub: "집테리어", icon: rollerIcon, color: "var(--color-brand-green)", soft: "var(--color-brand-green-soft)" },
  move: { label: "이사·정착", sub: "집서비스", icon: boxIcon, color: "#b8843a", soft: "#fbf1e2" },
};

export default function HomeSidebar() {
  const [tab, setTab] = useState<Tab>("home");
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [stage, setStage] = useState<Stage>(null);
  const [flowType, setFlowType] = useState<FlowType>(null);
  const [flowStep, setFlowStep] = useState<FlowStep>("form");

  function toggleStage(next: NonNullable<Stage>) {
    setStage((cur) => (cur === next ? null : next));
  }
  function startFlow(type: NonNullable<FlowType>) {
    setFlowType(type);
    setFlowStep("form");
  }
  function advanceFlow() {
    setFlowStep("done");
  }
  function closeFlow() {
    setFlowType(null);
    setFlowStep("form");
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
    <>
      <div className="flex h-full flex-shrink-0">
        <IconRail activeTab={panelCollapsed ? "map" : tab} onSelect={selectTab} />
        {!panelCollapsed && (
          <div className="flex h-full w-[22.5rem] flex-shrink-0 flex-col overflow-hidden border-r border-line bg-white">
            {tab === "home" && <HomePanel stage={stage} toggleStage={toggleStage} startFlow={startFlow} />}
            {tab === "listing" && <ListingPanel />}
            {tab === "buyreq" && <BuyReqPanel startFlow={startFlow} />}
            {tab === "service" && <ServicePanel startFlow={startFlow} />}
            {tab === "menu" && <MenuPanel />}
          </div>
        )}
      </div>

      {flowType && (
        <FlowModal type={flowType} step={flowStep} onAdvance={advanceFlow} onClose={closeFlow} />
      )}
    </>
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

function HomePanel({
  stage,
  toggleStage,
  startFlow,
}: {
  stage: Stage;
  toggleStage: (s: NonNullable<Stage>) => void;
  startFlow: (t: NonNullable<FlowType>) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
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

        <div className="relative pb-[46px]">
          <div className="flex items-start justify-between gap-1">
            {(["sell", "buy", "interior", "move"] as const).map((key, i) => {
              const meta = STAGE_META[key];
              return (
                <div key={key} className="flex items-center">
                  <button
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
                  {i < 3 && (
                    <Svg size={12} stroke="var(--color-line)" strokeWidth={2.4}>
                      <path d="M5 3l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  )}
                </div>
              );
            })}
          </div>

          <svg viewBox="0 0 320 26" className="absolute bottom-4 left-0 h-6 w-full" fill="none">
            <path
              d="M292 4 C 292 24, 28 24, 28 4"
              stroke="var(--color-line)"
              strokeWidth="2"
              strokeDasharray="3 4"
              strokeLinecap="round"
            />
            <path d="M28 4 l-6 7 M28 4 l8 5" stroke="var(--color-line)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="absolute inset-x-0 bottom-0 text-center text-[9.5px] text-muted">
            터치해서 지금 내 단계를 선택해보세요
          </p>
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
              const buttonLabel =
                key === "sell" ? "매물 등록하기" : key === "buy" ? "구매의뢰 남기기" : key === "interior" ? "시공사례 보기" : "집서비스 예약";
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => startFlow(key)}
                  className="flex flex-col gap-2.5 rounded-xl border border-line p-3 text-left transition hover:border-brand-green/40"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: meta.soft }}>
                    <Svg size={15} stroke={meta.color}>
                      {meta.icon}
                    </Svg>
                  </span>
                  <span className="text-[11.5px] font-bold leading-tight text-ink">{buttonLabel}</span>
                </button>
              );
            })}
          </div>
        )}

        {stage !== null && (
          <NextActionCard stage={stage} onClick={() => startFlow(stage)} />
        )}
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
          <p className="text-[13px] font-semibold text-ink">이 근처 시공사례</p>
          <span className="text-[11px] text-muted">더보기 ›</span>
        </div>
        <div className="flex gap-2">
          {[
            { name: "한일유앤아이", tag: "34평 · 모던" },
            { name: "역삼푸르지오", tag: "24평 · 내추럴" },
            { name: "판교봇들마을", tag: "44평 · 미니멀" },
          ].map((item) => (
            <div key={item.name} className="min-w-0 flex-1">
              <div className="flex h-[74px] items-center justify-center rounded-[10px] bg-brand-green-soft">
                <Svg size={24} stroke="var(--color-brand-green)" strokeWidth={1.5}>
                  {rollerIcon}
                </Svg>
              </div>
              <p className="mt-1.5 truncate text-[11px] font-semibold text-ink">{item.name}</p>
              <p className="mt-px text-[9.5px] text-muted">{item.tag}</p>
            </div>
          ))}
        </div>
      </div>

      <SectionDivider />

      {/* 집서비스 (이사 단계) */}
      <div className="px-[1.375rem] py-5">
        <StageBadge visible={stage === "move"} color="#b8843a" soft="#fbf1e2" />
        <button
          type="button"
          onClick={() => startFlow("move")}
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

      {/* 참고 정보 — 부가 정보일 뿐이라 절제된 톤 */}
      <div className="px-[1.375rem] pb-[18px] pt-1">
        <p className="mb-2 text-[11.5px] font-semibold text-muted">최근 많이 본 단지</p>
        <div className="flex flex-col">
          {[
            { name: "역삼푸르지오아파트", views: 128 },
            { name: "래미안 센트럴시티", views: 104 },
            { name: "마포래미안푸르지오", views: 97 },
          ].map((item, i) => (
            <div key={item.name} className="flex items-center gap-2 py-1.5">
              <span className="w-3 text-[11px] font-bold text-muted">{i + 1}</span>
              <span className="flex-1 text-[11.5px] text-ink">{item.name}</span>
              <span className="text-[10px] text-muted">열람 {item.views}</span>
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5">
          <span className="text-[10.5px] text-muted">참고 · 이번 주 서울 매매가 ▲0.25%</span>
          <span className="text-[10.5px] text-muted underline">시황 더보기</span>
        </div>
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
  const copy: Record<NonNullable<Stage>, { desc: string; cta: string }> = {
    sell: { desc: "등록비 0원 · 더블베네핏으로 돌려받는 매도", cta: "지금 매물 등록하기" },
    buy: { desc: "10초만에 구매의뢰 남기고 딱 맞는 집 찾기", cta: "구매의뢰 남기기" },
    interior: { desc: "같은 단지 시공사례 보고 3분 무료 견적", cta: "시공사례 보기" },
    move: { desc: "집이사 · 집청소, 이사 날짜 맞춰 한번에 예약", cta: "지금 예약하기" },
  };
  const c = copy[stage];
  return (
    <div className="flex items-center gap-3 rounded-2xl p-4" style={{ background: meta.soft }}>
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white">
        <Svg size={20} stroke={meta.color}>
          {meta.icon}
        </Svg>
      </span>
      <div className="flex-1">
        <p className="text-xs font-bold leading-snug text-ink">{c.desc}</p>
        <button
          type="button"
          onClick={onClick}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-white"
          style={{ background: meta.color }}
        >
          {c.cta}
          <Svg size={11} stroke="#fff" strokeWidth={2.4}>
            {chevronRight}
          </Svg>
        </button>
      </div>
    </div>
  );
}

function ListingPanel() {
  const listings = [
    { name: "래미안 센트럴시티", spec: "84.4㎡ · 12/20층", price: "18.5억", verified: true },
    { name: "역삼푸르지오아파트", spec: "59.8㎡ · 8/15층", price: "9.8억", verified: true },
    { name: "마포래미안푸르지오", spec: "114㎡ · 20/25층", price: "22억", verified: false },
  ];
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-[1.375rem] pb-4 pt-6">
        <p className="text-[15px] font-extrabold text-ink">매물</p>
        <p className="mt-1 text-xs text-muted">서울 서초구 반포동 · 매물 128개</p>
      </div>
      <div className="flex gap-1.5 px-[1.375rem] pb-4">
        <span className="rounded-full bg-brand-red px-3 py-1.5 text-[11.5px] font-bold text-white">매매</span>
        <span className="rounded-full border border-line px-3 py-1.5 text-[11.5px] font-semibold text-muted">전세</span>
        <span className="rounded-full border border-line px-3 py-1.5 text-[11.5px] font-semibold text-muted">월세</span>
      </div>
      <SectionDivider />
      <div className="flex flex-col gap-2.5 px-[1.375rem] py-4">
        {listings.map((item) => (
          <div key={item.name} className="flex gap-2.5 rounded-2xl border border-line p-3">
            <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[10px] bg-soft">
              <Svg size={26} stroke="#9aa19b" strokeWidth={1.6}>
                {houseIcon}
              </Svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[12.5px] font-bold text-ink">{item.name}</p>
                {item.verified && (
                  <span className="rounded bg-[#e8f7ee] px-1.5 py-px text-[9px] font-bold text-[#1f9d55]">인증</span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-muted">{item.spec}</p>
              <p className="mt-1 text-[13.5px] font-extrabold text-brand-red">{item.price}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BuyReqPanel({ startFlow }: { startFlow: (t: NonNullable<FlowType>) => void }) {
  const requests = [
    { area: "서울 강남구 · 10억~14억", status: "매칭중", statusColor: "text-brand-blue bg-[#eaf1ff]", date: "2026.08.20 접수 · 입주 희망 3개월 이내" },
    { area: "서울 서초구 · 15억~18억", status: "중개사 배정완료", statusColor: "text-[#1f9d55] bg-[#e8f7ee]", date: "2026.08.12 접수 · 입주 희망 즉시" },
  ];
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-[1.375rem] pb-4 pt-6">
        <p className="text-[15px] font-extrabold text-ink">내 구매의뢰</p>
        <p className="mt-1 text-xs text-muted">남긴 구매의뢰 {requests.length}건</p>
      </div>
      <div className="px-[1.375rem] pb-4">
        <button
          type="button"
          onClick={() => startFlow("buy")}
          className="w-full rounded-full bg-brand-blue py-2.5 text-center text-[12.5px] font-bold text-white"
        >
          + 새 구매의뢰 남기기
        </button>
      </div>
      <SectionDivider />
      <div className="flex flex-col gap-2.5 px-[1.375rem] py-4">
        {requests.map((item) => (
          <div key={item.area} className="rounded-2xl border border-line px-4 py-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12.5px] font-bold text-ink">{item.area}</p>
              <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${item.statusColor}`}>
                {item.status}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-muted">{item.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServicePanel({ startFlow }: { startFlow: (t: NonNullable<FlowType>) => void }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-[1.375rem] pb-4 pt-6">
        <p className="text-[15px] font-extrabold text-ink">집서비스</p>
        <p className="mt-1 text-xs text-muted">이사부터 청소까지 한번에</p>
      </div>
      <div className="flex gap-2 px-[1.375rem] pb-4">
        <button
          type="button"
          onClick={() => startFlow("move")}
          className="flex-1 rounded-2xl border border-line p-3.5 text-center"
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
          onClick={() => startFlow("move")}
          className="flex-1 rounded-2xl border border-line p-3.5 text-center"
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
        <p className="mb-2.5 text-[13px] font-semibold text-ink">예약 내역</p>
        <div className="rounded-2xl border border-line px-4 py-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] font-bold text-ink">포장이사</p>
            <span className="rounded-full bg-[#e8f7ee] px-2 py-0.5 text-[10px] font-bold text-[#1f9d55]">예약확정</span>
          </div>
          <p className="mt-1.5 text-[11px] text-muted">2026.09.15 예정 · 서울 → 경기</p>
        </div>
      </div>
    </div>
  );
}

function MenuPanel() {
  const items = [
    { label: "마이페이지", icon: <><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c1.5-4 4.5-6 7.5-6s6 2 7.5 6" strokeLinecap="round" /></> },
    { label: "관심 매물", icon: <path d="M12 20s-7-4.4-9.3-8.8C1.2 8 2.4 5 5.4 4.3 7.6 3.8 9.7 5 12 7.5c2.3-2.5 4.4-3.7 6.6-3.2 3 0.7 4.2 3.7 2.7 6.9C19 15.6 12 20 12 20z" strokeLinejoin="round" /> },
    { label: "파트너센터", icon: houseIcon },
    { label: "로그인 · 회원가입", icon: <><rect x="4" y="9" width="9" height="6" rx="1.5" /><path d="M6.5 9V6.5a2.5 2.5 0 0 1 5 0V9" strokeLinecap="round" /><circle cx="17" cy="12" r="3.4" /><path d="M17 12v2.4M17 9.6v.01" strokeLinecap="round" /></> },
    { label: "고객센터", icon: <><circle cx="12" cy="12" r="9" /><path d="M9.2 9.5a2.8 2.8 0 1 1 4 2.5c-.9.5-1.2 1-1.2 2" strokeLinecap="round" /><path d="M12 17v.01" strokeLinecap="round" /></> },
  ];
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-[1.375rem] pb-2 pt-6">
        <p className="text-[15px] font-extrabold text-ink">메뉴</p>
      </div>
      <div className="px-[1.375rem]">
        {items.map((item) => (
          <button key={item.label} type="button" className="flex w-full items-center gap-3 border-b border-line py-3.5 text-left">
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

const FLOW_META: Record<
  NonNullable<FlowType>,
  {
    title: string;
    icon: React.ReactNode;
    color: string;
    soft: string;
    fields: [string, string][];
    doneHeadline: string;
    doneSub: string;
  }
> = {
  sell: {
    title: "매물 등록하기",
    icon: houseIcon,
    color: "var(--color-brand-red)",
    soft: "var(--color-brand-red-soft)",
    fields: [
      ["주소", "서울 서초구 반포동"],
      ["평형", "34평"],
      ["희망 매매가", "15억"],
    ],
    doneHeadline: "매물 등록이 접수됐어요!",
    doneSub: "인증 중개사에게 바로 노출됩니다",
  },
  buy: {
    title: "구매의뢰 남기기",
    icon: searchIcon,
    color: "var(--color-brand-blue)",
    soft: "#eaf1ff",
    fields: [
      ["관심 지역", "서울 강남구"],
      ["예산", "10억 ~ 14억"],
      ["입주 희망 시기", "3개월 이내"],
    ],
    doneHeadline: "구매의뢰가 접수됐어요!",
    doneSub: "곧 담당 중개사가 연락드려요",
  },
  interior: {
    title: "견적문의 남기기",
    icon: rollerIcon,
    color: "var(--color-brand-green)",
    soft: "var(--color-brand-green-soft)",
    fields: [
      ["인테리어 희망 단지", "반포 래미안센트럴시티"],
      ["평형", "34평"],
      ["시공 희망 시기", "1개월 이내"],
    ],
    doneHeadline: "견적문의가 접수됐어요!",
    doneSub: "집테리어 담당자가 곧 연락드려요",
  },
  move: {
    title: "집서비스 예약하기",
    icon: boxIcon,
    color: "#b8843a",
    soft: "#fbf1e2",
    fields: [
      ["이사 예정일", "2026.09.15"],
      ["이동 경로", "서울 → 경기"],
      ["필요 서비스", "포장이사 + 입주청소"],
    ],
    doneHeadline: "예약 요청이 접수됐어요!",
    doneSub: "집서비스 담당자가 곧 연락드려요",
  },
};

function FlowModal({
  type,
  step,
  onAdvance,
  onClose,
}: {
  type: NonNullable<FlowType>;
  step: FlowStep;
  onAdvance: () => void;
  onClose: () => void;
}) {
  const meta = FLOW_META[type];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55">
      {step === "form" ? (
        <div className="w-[23.75rem] overflow-hidden rounded-[20px] bg-white shadow-2xl">
          <div className="flex items-center gap-2.5 border-b border-line px-6 py-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: meta.soft }}>
              <Svg size={18} stroke={meta.color}>
                {meta.icon}
              </Svg>
            </span>
            <p className="text-[15px] font-extrabold text-ink">{meta.title}</p>
          </div>
          <div className="flex flex-col gap-3 px-6 py-5">
            {meta.fields.map(([label, value]) => (
              <div key={label}>
                <p className="mb-1.5 text-[11px] font-semibold text-muted">{label}</p>
                <div className="rounded-[10px] border border-line px-3 py-2.5 text-[12.5px] text-ink">{value}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 px-6 pb-[22px]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-line py-3 text-center text-[13px] font-semibold text-muted"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onAdvance}
              className="flex-[2] rounded-full py-3 text-center text-[13px] font-bold text-white"
              style={{ background: meta.color }}
            >
              다음
            </button>
          </div>
        </div>
      ) : (
        <div className="w-[21.25rem] rounded-[20px] bg-white px-7 py-8 text-center shadow-2xl">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: meta.soft }}>
            <Svg size={26} stroke={meta.color} strokeWidth={2.4}>
              <path d="M4.5 12.5l5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </span>
          <p className="mt-4 text-base font-extrabold text-ink">{meta.doneHeadline}</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{meta.doneSub}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-full py-3 text-[13px] font-bold text-white"
            style={{ background: meta.color }}
          >
            확인
          </button>
        </div>
      )}
    </div>
  );
}
