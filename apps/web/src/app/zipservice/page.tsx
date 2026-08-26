import ServiceHeroSearch from "@/components/lifestyle/ServiceHeroSearch";
import TrendingTipsSection from "@/components/lifestyle/TrendingTipsSection";
import RecommendedProsSection from "@/components/lifestyle/RecommendedProsSection";
import PromoBanner from "@/components/lifestyle/PromoBanner";
import PhotoCardGrid from "@/components/lifestyle/PhotoCardGrid";
import SectionHeading from "@/components/lifestyle/SectionHeading";
import PartnerLogoStrip from "@/components/lifestyle/PartnerLogoStrip";
import PopularReviewsSection from "@/components/lifestyle/PopularReviewsSection";
import MagazineStoriesSection from "@/components/lifestyle/MagazineStoriesSection";
import MemberBenefitSection from "@/components/lifestyle/MemberBenefitSection";
import CompanyRecruitSection from "@/components/lifestyle/CompanyRecruitSection";
import ZipServiceFaq from "@/components/lifestyle/ZipServiceFaq";
import MobileStickyCta from "@/components/lifestyle/MobileStickyCta";
import { HOUSEHOLD_ROW, MOVING_MOMENT_ROW, LIFE_MOMENT_BUNDLES, INTERIOR_GRID } from "@/lib/mock-content";
import Icon from "@/components/lifestyle/Icon";
import Link from "next/link";

export default function ZipServicePage() {
  return (
    <>
      <ServiceHeroSearch />

      <TrendingTipsSection />

      <section className="mx-auto max-w-6xl px-5 py-14">
        <SectionHeading eyebrow="맞춤 서비스" title="이사·청소 맞춤 서비스" />
        <div className="mt-6">
          <PhotoCardGrid items={HOUSEHOLD_ROW} cols={4} />
        </div>
      </section>

      <RecommendedProsSection />

      <div className="mx-auto max-w-6xl px-5">
        <PromoBanner
          eyebrow="더 나은 집서비스를 위한"
          title="한마디, 고객의견함에 남겨주세요"
          icon="chat"
          accent="var(--color-brand-red-soft)"
          textClassName="text-brand-red"
        />
      </div>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <SectionHeading eyebrow="원스톱 준비" title="지금 필요한 서비스, 한 번에 견적받기" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {LIFE_MOMENT_BUNDLES.map((bundle) => (
            <Link
              key={bundle.title}
              href={bundle.href}
              className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-1 hover:shadow-brand"
            >
              <div className="p-5">
                <p className="text-xs font-medium text-muted">{bundle.label}</p>
                <p className="mt-1 text-lg font-bold text-ink">{bundle.title}</p>
              </div>
              <div className="relative mt-auto flex h-24 items-center justify-end pr-5" style={{ background: bundle.accent }}>
                <span className="h-14 w-14 text-white/85">
                  <Icon name={bundle.icon} />
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-3 text-xs font-semibold text-brand-red">
                {bundle.count}
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition group-hover:translate-x-0.5">
                  <path
                    fillRule="evenodd"
                    d="M7.3 4.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4L11.6 10 7.3 5.7a1 1 0 0 1 0-1.4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <SectionHeading eyebrow="복잡한 이사, 한 번에" title="필요한 순간, 한 번에 해결" />
        <div className="mt-6">
          <PhotoCardGrid items={MOVING_MOMENT_ROW} cols={4} />
        </div>
      </section>

      <PartnerLogoStrip />

      <section className="mx-auto max-w-6xl px-5 py-14">
        <SectionHeading eyebrow="집을 완성하는" title="가전·가구로 완성한 우리 집" moreHref="/zipservice/companies?category=furniture" />
        <div className="mt-6">
          <PhotoCardGrid items={INTERIOR_GRID} cols={6} />
        </div>
      </section>

      <PopularReviewsSection />

      <MagazineStoriesSection />

      <div className="mx-auto max-w-6xl px-5">
        <PromoBanner
          eyebrow="집팔고360 통합회원"
          title="회원이면 집서비스 전 카테고리 회원가"
          subtitle="집팔고·집사고·집테리어와 같은 계정으로, 로그인만 하면 자동 적용돼요"
          icon="gift"
          accent="var(--color-brand-green)"
          textClassName="text-white"
          cta={{ label: "회원가 확인하기", href: "/register" }}
        />
      </div>

      <MemberBenefitSection />

      <CompanyRecruitSection />

      <ZipServiceFaq />

      <div className="pb-16 md:hidden" />
      <MobileStickyCta />
    </>
  );
}
