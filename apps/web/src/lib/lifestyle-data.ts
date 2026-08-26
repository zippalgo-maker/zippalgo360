export type ServiceCategory =
  | "moving"
  | "move_out_cleaning"
  | "living_cleaning"
  | "appliance"
  | "furniture"
  | "subscription";

export type CategoryIconName = ServiceCategory;

export interface QuickQuestion {
  id: string;
  question: string;
  shortLabel: string;
  options: string[];
  multi?: boolean;
}

export interface PriceRange {
  min: number;
  max: number;
  unit: string;
}

export interface LifestyleCategoryMeta {
  value: ServiceCategory;
  label: string;
  shortDesc: string;
  regionLabel: string;
  quickQuestions: QuickQuestion[];
  priceRange?: PriceRange;
  memberDiscountPct?: number;
  memberBenefitNote: string;
}

export const CATEGORY_LIST: LifestyleCategoryMeta[] = [
  {
    value: "moving",
    label: "이사",
    shortDesc: "포장이사·용달이사 업체 매칭",
    regionLabel: "이사 도착지",
    quickQuestions: [
      {
        id: "moving_size",
        question: "이사 유형을 선택해주세요",
        shortLabel: "이사 유형",
        options: ["원룸/오피스텔", "투룸", "쓰리룸 이상", "사무실/상업공간"],
      },
      {
        id: "moving_type",
        question: "이사 방식을 선택해주세요",
        shortLabel: "이사 방식",
        options: ["포장이사", "반포장이사", "용달이사", "잘 모르겠어요"],
      },
    ],
    priceRange: { min: 350000, max: 1200000, unit: "" },
    memberDiscountPct: 12,
    memberBenefitNote: "최대 12% 할인 + 사다리차 지원 우선 배정",
  },
  {
    value: "move_out_cleaning",
    label: "이사청소",
    shortDesc: "입주 전/퇴거 후 청소",
    regionLabel: "청소 희망 지역",
    quickQuestions: [
      {
        id: "moc_timing",
        question: "청소 시점을 선택해주세요",
        shortLabel: "청소 시점",
        options: ["입주 전 청소", "이사 나간 후 청소", "둘 다 필요해요"],
      },
      {
        id: "moc_size",
        question: "평형대를 선택해주세요",
        shortLabel: "평형대",
        options: ["20평 이하", "20~30평대", "30~40평대", "40평 이상"],
      },
    ],
    priceRange: { min: 120000, max: 450000, unit: "" },
    memberDiscountPct: 10,
    memberBenefitNote: "최대 10% 할인",
  },
  {
    value: "living_cleaning",
    label: "생활청소",
    shortDesc: "정기·수시 방문 청소",
    regionLabel: "청소 희망 지역",
    quickQuestions: [
      {
        id: "lc_cycle",
        question: "청소 주기를 선택해주세요",
        shortLabel: "청소 주기",
        options: ["1회성", "매주", "격주", "매월"],
      },
      {
        id: "lc_size",
        question: "평형대를 선택해주세요",
        shortLabel: "평형대",
        options: ["20평 이하", "20~30평대", "30~40평대", "40평 이상"],
      },
    ],
    priceRange: { min: 80000, max: 150000, unit: "/회" },
    memberDiscountPct: 20,
    memberBenefitNote: "첫 이용 최대 20% 할인",
  },
  {
    value: "appliance",
    label: "가전",
    shortDesc: "평형·스타일 맞춤 AI 추천",
    regionLabel: "배송·설치 지역",
    quickQuestions: [
      {
        id: "appliance_interest",
        question: "관심 있는 가전을 선택해주세요 (복수 선택 가능)",
        shortLabel: "관심 가전",
        options: ["냉장고", "세탁기/건조기", "에어컨", "TV", "주방가전", "기타"],
        multi: true,
      },
    ],
    memberBenefitNote: "AI 맞춤 추천 + 최대 15% 캐시백",
  },
  {
    value: "furniture",
    label: "가구",
    shortDesc: "평형·스타일 맞춤 AI 추천",
    regionLabel: "배송·설치 지역",
    quickQuestions: [
      {
        id: "furniture_interest",
        question: "관심 있는 가구를 선택해주세요 (복수 선택 가능)",
        shortLabel: "관심 가구",
        options: ["침대", "소파", "식탁/의자", "붙박이장/드레스룸", "기타"],
        multi: true,
      },
    ],
    memberBenefitNote: "AI 맞춤 추천 + 최대 15% 캐시백",
  },
  {
    value: "subscription",
    label: "인터넷·TV·정수기",
    shortDesc: "생활 구독 서비스 신청",
    regionLabel: "설치 희망 지역",
    quickQuestions: [
      {
        id: "sub_interest",
        question: "관심 있는 상품을 선택해주세요 (복수 선택 가능)",
        shortLabel: "관심 상품",
        options: ["인터넷/TV", "정수기", "공기청정기", "비데", "기타"],
        multi: true,
      },
      {
        id: "sub_type",
        question: "가입 유형을 선택해주세요",
        shortLabel: "가입 유형",
        options: ["신규 가입", "기존 상품 해지 후 재가입", "잘 모르겠어요"],
      },
    ],
    memberBenefitNote: "가입 축하 사은품 최대 30만원 상당",
  },
];

export const HOME_STYLES = ["모던", "미니멀", "내추럴", "북유럽풍", "클래식", "기타"];

export function getCategoryMeta(value: ServiceCategory): LifestyleCategoryMeta {
  const found = CATEGORY_LIST.find((c) => c.value === value);
  if (!found) throw new Error(`Unknown category: ${value}`);
  return found;
}

export function formatWon(amount: number): string {
  if (amount >= 10000) {
    const man = amount / 10000;
    const rounded = Number.isInteger(man) ? man.toString() : man.toFixed(0);
    return `${rounded}만원`;
  }
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function formatPriceRange(range: PriceRange): string {
  return `${formatWon(range.min)} ~ ${formatWon(range.max)}${range.unit}`;
}

export function formatMemberPriceRange(range: PriceRange, discountPct: number): string {
  const memberMin = Math.round((range.min * (100 - discountPct)) / 100);
  const memberMax = Math.round((range.max * (100 - discountPct)) / 100);
  return `${formatWon(memberMin)} ~ ${formatWon(memberMax)}${range.unit}`;
}

export const PROCESS_STEPS = [
  { n: "1", title: "카테고리 선택", desc: "이사·청소·가전·가구 등 필요한 서비스를 고릅니다." },
  { n: "2", title: "맞춤 질문 답변", desc: "몇 가지 간단한 질문에 답하면 조건이 정리돼요." },
  { n: "3", title: "무료 견적 받기", desc: "제휴 업체가 조건에 맞는 견적을 보내드려요." },
  { n: "4", title: "회원가로 진행", desc: "집팔고360 회원이면 더 저렴한 회원가로 진행할 수 있어요." },
] as const;

export const FAQ_ITEMS = [
  {
    q: "회원가는 누구나 적용되나요?",
    a: "집팔고360에 로그인된 회원이라면 별도 인증 없이 집서비스 신청 시 회원가 혜택이 자동으로 적용돼요. 아직 회원이 아니라면 무료로 가입 후 이용하실 수 있어요.",
  },
  {
    q: "표시된 가격은 확정 견적인가요?",
    a: "위 가격은 참고를 위한 평균 시세 범위예요. 실제 견적은 지역·평형·현장 상황에 따라 달라질 수 있으며, 신청 후 제휴 업체가 정확한 견적을 안내해드려요.",
  },
  {
    q: "견적 신청 후 비용이 발생하나요?",
    a: "아니요, 견적 신청과 상담은 무료예요. 실제 서비스를 이용하기로 결정한 경우에만 비용이 발생해요.",
  },
  {
    q: "여러 카테고리를 한 번에 신청할 수 있나요?",
    a: "신청은 카테고리별로 진행돼요. 이사와 이사청소처럼 함께 필요한 경우, 각각 견적을 신청해주시면 더 정확한 안내를 받으실 수 있어요.",
  },
];
