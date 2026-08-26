import Link from "next/link";
import SectionHeading from "@/components/lifestyle/SectionHeading";
import ScrollRow from "@/components/lifestyle/ScrollRow";
import PortfolioCollageCard from "@/components/lifestyle/PortfolioCollageCard";
import CompanyLogo from "@/components/lifestyle/CompanyLogo";
import { MOCK_COMPANIES } from "@/lib/mock-companies";
import { PORTFOLIO_COLLAGE } from "@/lib/mock-content";

export default function PartnerLogoStrip() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <SectionHeading eyebrow="믿을 수 있는" title="제휴 업체의 작업 사례" moreHref="/zipservice/companies" />

      <div className="mt-6">
        <ScrollRow itemWidth={96}>
          {MOCK_COMPANIES.map((company) => (
            <Link key={company.id} href={`/zipservice/companies/${company.id}`} className="flex w-20 shrink-0 flex-col items-center gap-2 text-center">
              <CompanyLogo name={company.name} gradient={company.gradient} className="h-16 w-16 rounded-full text-lg" />
              <span className="line-clamp-2 break-keep text-xs font-medium text-ink/80">{company.name}</span>
            </Link>
          ))}
        </ScrollRow>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {PORTFOLIO_COLLAGE.map((collage) => (
          <PortfolioCollageCard key={collage.title} collage={collage} />
        ))}
      </div>
    </section>
  );
}
