import Link from "next/link";
import { MOCK_COMPANIES } from "@/lib/mock-companies";
import ProCard from "@/components/lifestyle/ProCard";

const FEATURED_IDS = ["moving-1", "moc-1", "lc-1"];

export default function FeaturedCompanies() {
  const featured = MOCK_COMPANIES.filter((c) => FEATURED_IDS.includes(c.id));

  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-red">TRUSTED PARTNERS</p>
          <h2 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">
            홍보 내용을 보고 업체를 직접 골라보세요
          </h2>
          <p className="mt-3 max-w-xl break-keep text-sm leading-relaxed text-muted sm:text-base">
            업체 소개·후기·응답률을 비교해서 마음에 드는 곳에 바로 견적을 요청할 수 있어요.
          </p>
        </div>
        <Link href="/zipservice/companies" className={`${"w-fit"} inline-flex items-center gap-1 text-sm font-semibold text-brand-red`}>
          전체 업체 둘러보기
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M7.3 4.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4L11.6 10 7.3 5.7a1 1 0 0 1 0-1.4z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((company) => (
          <ProCard key={company.id} company={company} />
        ))}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        * 위 업체 프로필은 디자인 검토를 위한 예시이며, 실제 입점 업체 정보가 아니에요.
      </p>
    </section>
  );
}
