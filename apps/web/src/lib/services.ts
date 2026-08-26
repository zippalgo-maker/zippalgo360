export type ServiceStatus = "live" | "preparing";

export interface ServiceInfo {
  slug: string;
  name: string;
  navSubtitle?: string;
  tagline: string;
  description: string;
  status: ServiceStatus;
  href: string;
  icon: string;
  ctaLabel: string;
}

export const SERVICES: ServiceInfo[] = [
  {
    slug: "zippalgo",
    name: "집팔고",
    tagline: "팔면서, 얻는다",
    description:
      "집을 팔고 싶은 회원이 매물을 등록하면 회원 공인중개사가 건당 결제로 열람하고 중개에 활용합니다. 매매가 완료되면 결제 금액이 매물 등록 고객에게 지급되는 더블베네핏 구조입니다.",
    status: "live",
    href: "/zippalgo",
    icon: "/icons/zippalgo.png",
    ctaLabel: "매물 등록하고 현금받기",
  },
  {
    slug: "zipsago",
    name: "집사고",
    tagline: "조건만 의뢰하면, 중개사가 찾아드려요",
    description:
      "원하는 집의 조건(지역·평형·예산)을 의뢰하면 집팔고360에 가입된 회원 공인중개사에게 공유되어 원하는 집을 찾는 것을 돕습니다.",
    status: "live",
    href: "/zipsago",
    icon: "/icons/zipsago.png",
    ctaLabel: "구매의뢰 등록하기",
  },
  {
    slug: "zipterior",
    name: "집테리어",
    tagline: "우리집과 같은집, 어떻게 고쳤을까?",
    description:
      "인테리어 업체가 시공한 포트폴리오를 확인하고, 내 집과 같은 단지·같은 평형이 인테리어된 사례를 보고 마음에 들면 견적문의를 보내 상담받을 수 있습니다.",
    status: "live",
    href: "/zipterior",
    icon: "/icons/zipterior.png",
    ctaLabel: "시공사례 찾기",
  },
  {
    slug: "zipservice",
    name: "집서비스",
    navSubtitle: "이사·청소·가전·가구",
    tagline: "이사부터 생활까지, 집의 모든 순간",
    description:
      "이사, 이사청소, 생활청소는 물론 내 집 평형과 스타일에 맞는 가전·가구를 AI가 추천해주고, 인터넷·TV·정수기 같은 생활 구독 서비스까지 한 번에 신청할 수 있는 집팔고360의 통합 라이프스타일 서비스입니다.",
    status: "preparing",
    href: "/zipservice",
    icon: "/icons/zipmove.png",
    ctaLabel: "관심 등록하기",
  },
];
