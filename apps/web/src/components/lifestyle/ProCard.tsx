import Link from "next/link";
import type { MockCompany } from "@/lib/mock-companies";
import CompanyLogo from "@/components/lifestyle/CompanyLogo";
import { secondaryButtonClass } from "@/lib/ui";

function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-amber-400">
      <path d="M10 1.6l2.5 5.1 5.6.8-4 4 1 5.6L10 14.5l-5 2.6 1-5.6-4-4 5.6-.8z" />
    </svg>
  );
}

export default function ProCard({ company }: { company: MockCompany }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-brand">
      <div
        className="h-16 w-full"
        style={{ background: `linear-gradient(120deg, ${company.gradient[0]}, ${company.gradient[1]})` }}
      />

      <div className="flex-1 px-5 pb-5">
        <div className="-mt-8 flex items-end gap-3">
          <CompanyLogo name={company.name} gradient={company.gradient} className="h-16 w-16 rounded-2xl border-4 border-white text-2xl shadow-brand" />
          <div className="pb-1">
            <div className="flex items-center gap-1 text-xs font-semibold text-ink/70">
              <StarIcon />
              {company.rating.toFixed(1)}
              <span className="font-normal text-muted">({company.reviewCount})</span>
            </div>
          </div>
        </div>

        <p className="mt-3 text-base font-bold text-ink">{company.name}</p>
        <p className="mt-0.5 break-keep text-sm text-muted">{company.tagline}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {company.highlightTags.map((tag) => (
            <span key={tag} className="rounded-full bg-brand-red-soft px-2.5 py-1 text-[11px] font-semibold text-brand-red">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-soft px-3 py-2.5 text-xs text-muted">
          <span>응답률 {company.responseRate}%</span>
          <span>{company.responseTimeLabel}</span>
          <span>{company.completedCount}</span>
          <span className="truncate">{company.regions.join(", ")}</span>
        </div>

        <p className="mt-3 text-xs font-semibold text-brand-green">{company.memberBenefit}</p>

        <div className="mt-4 flex gap-2">
          <Link href={`/zipservice/companies/${company.id}`} className={`${secondaryButtonClass} flex-1 py-2.5 text-center text-xs`}>
            프로필 보기
          </Link>
          <Link
            href={`/zipservice/new?category=${company.category}&company=${company.id}`}
            className="flex-1 rounded-full bg-brand-red px-4 py-2.5 text-center text-xs font-semibold text-white transition hover:bg-brand-red-dark"
          >
            이 업체에 견적요청
          </Link>
        </div>
      </div>
    </div>
  );
}
