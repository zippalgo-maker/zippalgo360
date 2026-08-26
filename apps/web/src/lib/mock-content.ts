/**
 * 목업(mock) 콘텐츠 — 실제 후기/게시글/뉴스가 아님.
 *
 * 숨고 홈 화면 구조(트렌딩 카드/서브카테고리 로우/매거진/인기글/지역 칩 등)를
 * 참고해 집서비스 화면을 목업하기 위한 프론트엔드 전용 샘플 텍스트. 실제
 * 서비스에 적용할 땐 실 이용자 후기·콘텐츠로 교체해야 한다.
 */
import type { IconName } from "@/components/lifestyle/Icon";
import type { ServiceCategory } from "@/lib/lifestyle-data";

export interface PhotoCardItem {
  icon: IconName;
  title: string;
  subtitle?: string;
  accent: string;
  href?: string;
}

const RED = "#bb1730";
const RED_DARK = "#951125";
const BLUE = "#427cff";
const GREEN = "#21463b";
const GREEN_2 = "#2f5c4e";
const GREEN_3 = "#447466";

export const TRENDING_FILTERS = ["이사·이사청소", "생활청소", "가전·가구", "인터넷·구독"];

export const TRENDING_CARDS: Record<string, PhotoCardItem[]> = {
  "이사·이사청소": [
    { icon: "truck", title: "이사 준비만으로도 진 빠지는데, 견적은 한 번에", subtitle: "서울 강남구 · 이사", accent: BLUE, href: "/zipservice/new?category=moving" },
    { icon: "ladder", title: "포장이사 견적, 업체마다 얼마나 차이 날까요", subtitle: "서울 강남구 · 이사", accent: GREEN_2, href: "/zipservice/new?category=moving" },
    { icon: "box", title: "반포장이사로 비용 아끼는 법", subtitle: "경기 성남시 · 이사", accent: RED, href: "/zipservice/new?category=moving" },
    { icon: "sparkle", title: "입주 전 청소, 언제 예약해야 할까요", subtitle: "서울 마포구 · 이사청소", accent: GREEN_3, href: "/zipservice/new?category=move_out_cleaning" },
    { icon: "shield", title: "너무너무 깨끗하게 잘해주셨어요", subtitle: "서울 강남구 · 이사청소", accent: RED_DARK, href: "/zipservice/companies?category=move_out_cleaning" },
    { icon: "chat", title: "이사청소 후기, 실제로 믿을 수 있을까요", subtitle: "인천 · 이사청소", accent: GREEN, href: "/zipservice/companies?category=move_out_cleaning" },
  ],
  생활청소: [
    { icon: "spray", title: "정기청소 맡기고 나서 주말이 달라졌어요", subtitle: "서울 강남구 · 생활청소", accent: GREEN_3, href: "/zipservice/new?category=living_cleaning" },
    { icon: "calendar", title: "청소 주기, 우리 집엔 몇 번이 적당할까", subtitle: "서울 송파구 · 생활청소", accent: BLUE, href: "/zipservice/new?category=living_cleaning" },
    { icon: "leaf", title: "반려동물 있어도 정기청소 가능할까요", subtitle: "경기 고양시 · 생활청소", accent: GREEN, href: "/zipservice/new?category=living_cleaning" },
    { icon: "sun", title: "여름철 곰팡이 청소, 셀프 말고 전문가에게", subtitle: "서울 강남구 · 생활청소", accent: RED, href: "/zipservice/new?category=living_cleaning" },
    { icon: "shield", title: "동일 매니저 배정, 실제로 되나요", subtitle: "서울 강남구 · 생활청소", accent: RED_DARK, href: "/zipservice/companies?category=living_cleaning" },
    { icon: "chat", title: "회원가로 첫 이용 20% 할인 받았어요", subtitle: "서울 강남구 · 생활청소", accent: GREEN_2, href: "/zipservice/new?category=living_cleaning" },
  ],
  "가전·가구": [
    { icon: "fridge", title: "24평 신혼집, 냉장고 용량 이 정도면 될까요", subtitle: "가전 · AI 추천", accent: RED, href: "/zipservice/new?category=appliance" },
    { icon: "sofa", title: "거실 소파 배치, 3D로 미리 보고 골랐어요", subtitle: "가구 · AI 추천", accent: RED_DARK, href: "/zipservice/new?category=furniture" },
    { icon: "box", title: "1인가구 미니 세탁기 추천 받아보세요", subtitle: "가전 · AI 추천", accent: BLUE, href: "/zipservice/new?category=appliance" },
    { icon: "leaf", title: "북유럽풍 식탁 세트, 평형에 맞게 고르는 법", subtitle: "가구 · AI 추천", accent: GREEN_3, href: "/zipservice/new?category=furniture" },
    { icon: "sun", title: "공기청정기 렌탈, 캐시백까지 비교해보세요", subtitle: "가전 · AI 추천", accent: GREEN, href: "/zipservice/new?category=appliance" },
    { icon: "key", title: "붙박이장으로 수납 늘리는 배치 팁", subtitle: "가구 · AI 추천", accent: GREEN_2, href: "/zipservice/new?category=furniture" },
  ],
  "인터넷·구독": [
    { icon: "wifi", title: "인터넷·TV, 결합하면 얼마나 저렴할까요", subtitle: "인터넷·구독", accent: GREEN, href: "/zipservice/new?category=subscription" },
    { icon: "bell", title: "가입 축하 사은품, 상품별로 비교해보세요", subtitle: "인터넷·구독", accent: RED, href: "/zipservice/new?category=subscription" },
    { icon: "shield", title: "무약정 옵션도 안내해드려요", subtitle: "인터넷·구독", accent: BLUE, href: "/zipservice/new?category=subscription" },
    { icon: "leaf", title: "정수기 렌탈, 관리 주기까지 한 번에", subtitle: "인터넷·구독", accent: GREEN_3, href: "/zipservice/new?category=subscription" },
    { icon: "gift", title: "회원이면 사은품 최대 30만원", subtitle: "인터넷·구독", accent: RED_DARK, href: "/zipservice/new?category=subscription" },
    { icon: "chat", title: "이사할 때 인터넷 이전 신청도 같이하세요", subtitle: "인터넷·구독", accent: GREEN_2, href: "/zipservice/new?category=subscription" },
  ],
};

export const HOUSEHOLD_ROW: PhotoCardItem[] = [
  { icon: "truck", title: "포장이사", subtitle: "이사", accent: BLUE, href: "/zipservice/new?category=moving" },
  { icon: "box", title: "반포장·용달이사", subtitle: "이사", accent: GREEN_2, href: "/zipservice/new?category=moving" },
  { icon: "sparkle", title: "입주청소", subtitle: "이사청소", accent: GREEN_3, href: "/zipservice/new?category=move_out_cleaning" },
  { icon: "spray", title: "정기청소", subtitle: "생활청소", accent: RED, href: "/zipservice/new?category=living_cleaning" },
];

export const MOVING_MOMENT_ROW: PhotoCardItem[] = [
  { icon: "truck", title: "이사·입주청소업체", subtitle: "포장이사부터 입주청소까지", accent: BLUE, href: "/zipservice/companies?category=moving" },
  { icon: "box", title: "원룸/소형 이사", subtitle: "1인가구 특화 이사팀", accent: RED, href: "/zipservice/new?category=moving" },
  { icon: "sparkle", title: "가정이사(투룸 이상)", subtitle: "포장·정리까지 한 번에", accent: GREEN_3, href: "/zipservice/new?category=moving" },
  { icon: "spray", title: "거주청소업체", subtitle: "매주·격주 정기 방문청소", accent: GREEN, href: "/zipservice/companies?category=living_cleaning" },
];

export interface LifeMomentBundle {
  label: string;
  title: string;
  count: string;
  icon: IconName;
  accent: string;
  href: string;
}

export const LIFE_MOMENT_BUNDLES: LifeMomentBundle[] = [
  { label: "이사할 때 놓치기 쉬운", title: "이사 한 번에 준비", count: "이사 서비스 2종", icon: "truck", accent: BLUE, href: "/zipservice/companies?category=moving" },
  { label: "새집으로 가볍게", title: "입주청소 예약", count: "청소 서비스 2종", icon: "sparkle", accent: GREEN_3, href: "/zipservice/companies?category=move_out_cleaning" },
  { label: "평형에 딱 맞는", title: "가전·가구 AI 추천", count: "가전·가구 2종", icon: "sofa", accent: RED, href: "/zipservice/companies?category=appliance" },
  { label: "매달 나가는 돈 줄이는", title: "생활 구독 비교", count: "구독 서비스 1종", icon: "wifi", accent: GREEN, href: "/zipservice/new?category=subscription" },
];

export interface PortfolioCollage {
  title: string;
  subtitle: string;
  icons: IconName[];
  accent: string;
  companyId: string;
}

export const PORTFOLIO_COLLAGE: PortfolioCollage[] = [
  { title: "이사 후 입주청소 시공사례", subtitle: "서울 강남구", icons: ["sparkle", "truck", "box"], accent: GREEN_3, companyId: "moc-1" },
  { title: "정기청소로 관리한 거실", subtitle: "경기 성남시", icons: ["spray", "leaf", "sun"], accent: GREEN_2, companyId: "lc-1" },
];

export const INTERIOR_GRID: PhotoCardItem[] = [
  { icon: "fridge", title: "24평 신혼집 냉장고 추천", subtitle: "가전 · 리빙테크 가전스토어", accent: RED, href: "/zipservice/companies/appliance-1" },
  { icon: "key", title: "붙박이장으로 수납 늘리기", subtitle: "가구 · 우드리빙 퍼니처", accent: GREEN_2, href: "/zipservice/companies/furniture-1" },
  { icon: "sofa", title: "거실 소파 배치 3D 시뮬레이션", subtitle: "가구 · 우드리빙 퍼니처", accent: RED_DARK, href: "/zipservice/companies/furniture-1" },
  { icon: "box", title: "1인가구 미니 세탁기 추천", subtitle: "가전 · 리빙테크 가전스토어", accent: BLUE, href: "/zipservice/companies/appliance-1" },
  { icon: "leaf", title: "북유럽풍 식탁 세트 배치", subtitle: "가구 · 우드리빙 퍼니처", accent: GREEN_3, href: "/zipservice/companies/furniture-1" },
  { icon: "sun", title: "공기청정기 렌탈 캐시백 비교", subtitle: "가전 · 리빙테크 가전스토어", accent: GREEN, href: "/zipservice/companies/appliance-1" },
];

export interface MagazineStory {
  label: string;
  teaser: string;
  articleTitle: string;
  snippet: string;
  views: number;
  accent: string;
  icon: IconName;
}

export const MAGAZINE_STORIES: MagazineStory[] = [
  {
    label: "생활의 기술",
    teaser: "이사 견적, 손해 없이 비교하는 법",
    articleTitle: "이사 견적서 볼 때 꼭 확인해야 할 3가지",
    snippet: "같은 평형이어도 견적이 왜 다른지, 포장이사와 반포장이사 차이부터 짚어드려요.",
    views: 1056,
    accent: GREEN_3,
    icon: "truck",
  },
  {
    label: "생활의 기술",
    teaser: "정기청소, 우리 집엔 몇 번이 적당할까",
    articleTitle: "생활청소 주기 정하는 가장 쉬운 기준",
    snippet: "반려동물, 재택근무 여부에 따라 추천 주기가 달라져요. 나에게 맞는 주기 찾기.",
    views: 834,
    accent: RED,
    icon: "spray",
  },
  {
    label: "생활의 기술",
    teaser: "회원가로 아끼는 집서비스 이용법",
    articleTitle: "집팔고360 회원이면 놓치기 아까운 혜택",
    snippet: "로그인만 해도 견적 신청할 때 회원가가 자동 적용돼요. 카테고리별 혜택 총정리.",
    views: 3928,
    accent: GREEN,
    icon: "gift",
  },
];

export interface PopularReview {
  rank: number;
  title: string;
  snippet: string;
  likes: number;
  comments: number;
}

export const POPULAR_REVIEWS: PopularReview[] = [
  { rank: 1, title: "이사 당일 사다리차, 꼭 필요할까요?", snippet: "가구가 많지 않으면 계단으로도 가능하다고 하셨는데 실제로는...", likes: 12, comments: 4 },
  { rank: 2, title: "입주청소 언제 예약하는 게 좋을까요", snippet: "잔금 치르기 며칠 전에 예약해야 일정이 안 꼬인다고 하네요.", likes: 8, comments: 2 },
  { rank: 3, title: "정기청소 매니저 바뀌어도 괜찮나요", snippet: "동일 매니저 배정이 기본이지만 부득이한 경우 사전 안내해준대요.", likes: 15, comments: 6 },
  { rank: 4, title: "가전 AI 추천, 믿을 만한가요", snippet: "평형이랑 가족수 입력했더니 생각보다 정확하게 추천해줬어요.", likes: 6, comments: 1 },
  { rank: 5, title: "회원가 할인은 어떻게 적용되나요", snippet: "로그인만 하면 견적 신청할 때 자동으로 적용된다고 해요.", likes: 21, comments: 9 },
  { rank: 6, title: "구독 서비스 위약금 없이 바꾸는 법", snippet: "기존 약정 끝나는 시점 확인하고 신청하면 위약금이 없대요.", likes: 4, comments: 0 },
];

export const REGION_CHIPS = [
  "서울", "경기", "인천", "세종", "강원", "충북", "충남", "경북",
  "대전", "대구", "전북", "경남", "울산", "전남·광주", "부산", "제주",
];

export const CATEGORY_GALLERY_ICONS: Record<ServiceCategory, IconName[]> = {
  moving: ["truck", "box", "ladder"],
  move_out_cleaning: ["sparkle", "spray", "shield"],
  living_cleaning: ["spray", "leaf", "calendar"],
  appliance: ["fridge", "sun", "box"],
  furniture: ["sofa", "key", "leaf"],
  subscription: ["wifi", "gift", "bell"],
};

export interface RecruitNotification {
  companyId: string;
  time: string;
  category: ServiceCategory;
  categoryLabel: string;
  region: string;
  snippet: string;
}

export const RECRUIT_NOTIFICATIONS: RecruitNotification[] = [
  { companyId: "moving-1", time: "30분 전", category: "moving", categoryLabel: "이사", region: "서울 강남구", snippet: "포장이사 견적 문의 드립니다. 투룸이고 희망일은..." },
  { companyId: "lc-1", time: "5시간 전", category: "living_cleaning", categoryLabel: "생활청소", region: "서울 마포구", snippet: "매주 정기청소 가능한지, 매니저 배정 관련 문의..." },
];
