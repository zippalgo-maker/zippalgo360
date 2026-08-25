export type ServiceStatus = "live" | "preparing";

export interface ServiceInfo {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  status: ServiceStatus;
  href: string;
}

export const SERVICES: ServiceInfo[] = [
  {
    slug: "jipalgo",
    name: "집팔고",
    tagline: "매물을 올리면, 팔릴 때 보상받는다",
    description:
      "집을 팔고 싶은 회원이 매물을 등록하면 회원 공인중개사가 건당 결제로 열람하고 중개에 활용합니다. 매매가 완료되면 결제 금액이 매물 등록 고객에게 지급되는 더블베네핏 구조입니다.",
    status: "live",
    href: "/jipalgo",
  },
  {
    slug: "jipsago",
    name: "집사고",
    tagline: "원하는 조건을 의뢰하면, 중개사가 찾아드립니다",
    description:
      "원하는 집의 조건(지역·평형·예산)을 의뢰하면 집팔고360에 가입된 회원 공인중개사에게 공유되어 원하는 집을 찾는 것을 돕습니다.",
    status: "live",
    href: "/jipsago",
  },
  {
    slug: "jipterior",
    name: "집테리어",
    tagline: "같은 집, 같은 평형의 인테리어를 먼저 확인하세요",
    description:
      "인테리어 업체가 시공한 포트폴리오를 확인하고, 내 집과 같은 단지·같은 평형이 인테리어된 사례를 보고 마음에 들면 견적문의를 보내 상담받을 수 있습니다.",
    status: "live",
    href: "https://zipterior.kr",
  },
  {
    slug: "jipisa",
    name: "집이사",
    tagline: "이사도 집팔고360에서, 곧 만나요",
    description: "이사 업체 매칭 서비스를 준비하고 있습니다.",
    status: "preparing",
    href: "/jipisa",
  },
  {
    slug: "jipcheongso",
    name: "집청소",
    tagline: "이사 후 청소까지, 곧 만나요",
    description: "청소 업체 매칭 서비스를 준비하고 있습니다.",
    status: "preparing",
    href: "/jipcheongso",
  },
];
