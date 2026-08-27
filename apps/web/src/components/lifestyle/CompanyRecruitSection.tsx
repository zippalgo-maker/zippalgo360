import Link from "next/link";
import CompanyLogo from "@/components/lifestyle/CompanyLogo";
import { getMockCompany } from "@/lib/mock-companies";
import { REGION_CHIPS, RECRUIT_NOTIFICATIONS } from "@/lib/mock-content";
import { primaryButtonClass } from "@/lib/ui";

export default function CompanyRecruitSection() {
  return (
    <section className="bg-soft">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <h2 className="text-2xl font-bold leading-snug text-ink sm:text-3xl">
          전국 집서비스
          <br className="sm:hidden" /> 제휴 업체
        </h2>
        <p className="mt-3 max-w-md break-keep text-sm text-muted">
          믿을 수 있는 전문 업체를 집서비스 단 한 곳에서 찾으세요
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {REGION_CHIPS.map((region) => (
            <span key={region} className="rounded-full bg-brand-red-soft px-4 py-2 text-sm font-medium text-brand-red">
              {region}
            </span>
          ))}
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h3 className="break-keep text-2xl font-bold leading-snug text-ink sm:text-3xl">
              업체이신가요? 집서비스에서
              <br />
              새로운 고객을 <span className="text-brand-red">만나보세요</span>
            </h3>
            <Link href="/onboarding/company" className={`${primaryButtonClass} mt-6 w-fit px-8`}>
              업체 가입
            </Link>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="rounded-3xl border border-line bg-white p-5 shadow-brand">
              <p className="text-sm font-semibold text-ink">받은요청</p>
              <div className="mt-4 space-y-3">
                {RECRUIT_NOTIFICATIONS.map((n) => {
                  const company = getMockCompany(n.companyId);
                  if (!company) return null;
                  return (
                    <div key={n.companyId} className="flex items-start gap-3 rounded-xl border border-line p-3">
                      <CompanyLogo name={company.name} gradient={company.gradient} className="h-9 w-9 rounded-full text-xs" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-ink">{n.categoryLabel}</p>
                          <span className="shrink-0 text-[11px] text-muted">{n.time}</span>
                        </div>
                        <p className="truncate text-xs text-muted">{n.region}</p>
                        <p className="mt-1 truncate text-xs text-ink/70">{n.snippet}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-4 text-center text-sm font-medium text-muted">고객의 요청서를 무료로 받으세요</p>
          </div>
        </div>
      </div>
    </section>
  );
}
