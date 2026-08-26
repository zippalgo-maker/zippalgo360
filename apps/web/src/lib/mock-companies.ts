/**
 * 목업(mock) 데이터 — 실제 업체가 아님.
 *
 * "업체 사진/홍보문구 보고 직접 선택" UX를 먼저 화면으로 확인해보기 위한
 * 프론트엔드 전용 샘플 데이터. 백엔드 `companies` 테이블/API는 아직 손대지
 * 않았고(견적 요청 시 실제로 매칭되는 업체가 아님), 이 디자인을 실제로
 * 적용하기로 하면 그때 `apps/api`에 업체 프로필(사진·소개·태그) 컬럼과
 * 공개 조회 API를 추가하고 이 파일을 실 데이터 fetch로 교체해야 한다.
 */
import type { ServiceCategory } from "@/lib/lifestyle-data";

export interface MockCompany {
  id: string;
  category: ServiceCategory;
  name: string;
  tagline: string;
  description: string;
  highlightTags: string[];
  rating: number;
  reviewCount: number;
  responseRate: number;
  responseTimeLabel: string;
  completedCount: string;
  regions: string[];
  gradient: [string, string];
  memberBenefit: string;
}

export const MOCK_COMPANIES: MockCompany[] = [
  {
    id: "moving-1",
    category: "moving",
    name: "든든이사 파트너스",
    tagline: "포장부터 정리까지, 반나절이면 끝",
    description:
      "10년 경력 이사팀이 직접 포장·운반·배치를 진행합니다. 사다리차·에어컨 이전 설치까지 한 번에 처리해요.",
    highlightTags: ["예약 많은 업체", "당일 견적 가능", "사다리차 보유"],
    rating: 4.9,
    reviewCount: 312,
    responseRate: 98,
    responseTimeLabel: "평균 30분 이내 응답",
    completedCount: "1,200+ 건 완료",
    regions: ["서울 전역", "경기 남부"],
    gradient: ["#21463b", "#447466"],
    memberBenefit: "집팔고360 회원 최대 12% 할인",
  },
  {
    id: "moving-2",
    category: "moving",
    name: "손없는날 이사",
    tagline: "1인가구 소형이사 전문",
    description:
      "원룸·투룸 소형 이사에 특화된 용달 이사팀입니다. 견적 상담이 빠르고 정직해요.",
    highlightTags: ["빠른 응답", "1인가구 특화", "친절 상담"],
    rating: 4.8,
    reviewCount: 189,
    responseRate: 95,
    responseTimeLabel: "평균 1시간 이내 응답",
    completedCount: "800+ 건 완료",
    regions: ["서울 전역"],
    gradient: ["#bb1730", "#951125"],
    memberBenefit: "집팔고360 회원 최대 12% 할인",
  },
  {
    id: "moc-1",
    category: "move_out_cleaning",
    name: "반짝케어 클리닝",
    tagline: "입주 전 새집처럼, 이사 후 깨끗하게",
    description:
      "친환경 세제만 사용하는 입주·이사청소 전문팀입니다. 시공 전후 사진을 꼭 남겨드려요.",
    highlightTags: ["친환경 세제", "시공사진 제공", "당일 예약 가능"],
    rating: 4.9,
    reviewCount: 256,
    responseRate: 97,
    responseTimeLabel: "평균 20분 이내 응답",
    completedCount: "950+ 건 완료",
    regions: ["서울 전역", "인천"],
    gradient: ["#427cff", "#21463b"],
    memberBenefit: "집팔고360 회원 최대 10% 할인",
  },
  {
    id: "lc-1",
    category: "living_cleaning",
    name: "클린맘 홈케어",
    tagline: "정기청소 만족도 1순위",
    description:
      "매주·격주 정기 방문청소를 전문으로 합니다. 동일 매니저 배정으로 우리 집 패턴을 기억해요.",
    highlightTags: ["동일 매니저 배정", "반려동물 가능", "회원 할인"],
    rating: 4.9,
    reviewCount: 421,
    responseRate: 99,
    responseTimeLabel: "평균 15분 이내 응답",
    completedCount: "2,000+ 건 완료",
    regions: ["서울 전역", "경기 전역"],
    gradient: ["#2f5c4e", "#427cff"],
    memberBenefit: "집팔고360 회원 첫 이용 20% 할인",
  },
  {
    id: "appliance-1",
    category: "appliance",
    name: "리빙테크 가전스토어",
    tagline: "평형·스타일 맞춤 AI 가전 추천",
    description:
      "내 집 평형과 라이프스타일을 입력하면 필요한 가전을 큐레이션해드려요. 설치·폐기까지 원스톱.",
    highlightTags: ["AI 맞춤 추천", "설치·폐기 포함", "정품 인증"],
    rating: 4.8,
    reviewCount: 143,
    responseRate: 96,
    responseTimeLabel: "평균 1시간 이내 응답",
    completedCount: "600+ 건 완료",
    regions: ["전국 배송"],
    gradient: ["#447466", "#bb1730"],
    memberBenefit: "집팔고360 회원 최대 15% 캐시백",
  },
  {
    id: "furniture-1",
    category: "furniture",
    name: "우드리빙 퍼니처",
    tagline: "우리 집 평형에 딱 맞는 가구 배치",
    description:
      "붙박이장·드레스룸부터 소품까지, 공간에 맞는 가구를 3D로 미리 보여드려요.",
    highlightTags: ["3D 배치 시뮬레이션", "맞춤 제작 가능", "회원 캐시백"],
    rating: 4.7,
    reviewCount: 98,
    responseRate: 94,
    responseTimeLabel: "평균 2시간 이내 응답",
    completedCount: "350+ 건 완료",
    regions: ["전국 배송"],
    gradient: ["#951125", "#21463b"],
    memberBenefit: "집팔고360 회원 최대 15% 캐시백",
  },
  {
    id: "subscription-1",
    category: "subscription",
    name: "스마트홈 라이프",
    tagline: "인터넷·정수기·공기청정기 한 번에 가입",
    description:
      "여러 통신사·렌탈사 상품을 비교해서 가장 유리한 조건으로 안내해드립니다.",
    highlightTags: ["상품 비교 안내", "무약정 옵션 안내", "사은품 증정"],
    rating: 4.6,
    reviewCount: 77,
    responseRate: 92,
    responseTimeLabel: "평균 3시간 이내 응답",
    completedCount: "500+ 건 완료",
    regions: ["전국"],
    gradient: ["#21463b", "#427cff"],
    memberBenefit: "집팔고360 회원 가입 축하 사은품 최대 30만원",
  },
];

export function getMockCompany(id: string): MockCompany | undefined {
  return MOCK_COMPANIES.find((c) => c.id === id);
}

export function getMockCompaniesByCategory(category: ServiceCategory | null): MockCompany[] {
  if (!category) return MOCK_COMPANIES;
  return MOCK_COMPANIES.filter((c) => c.category === category);
}

export function searchMockCompanies(companies: MockCompany[], query: string): MockCompany[] {
  const q = query.trim().toLowerCase();
  if (!q) return companies;
  return companies.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.tagline.toLowerCase().includes(q) ||
      c.highlightTags.some((tag) => tag.toLowerCase().includes(q))
  );
}
