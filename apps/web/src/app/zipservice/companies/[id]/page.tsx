"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { getCategoryMeta } from "@/lib/lifestyle-data";
import { getMockCompany } from "@/lib/mock-companies";
import CompanyLogo from "@/components/lifestyle/CompanyLogo";
import { secondaryButtonClass } from "@/lib/ui";

function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-amber-400">
      <path d="M10 1.6l2.5 5.1 5.6.8-4 4 1 5.6L10 14.5l-5 2.6 1-5.6-4-4 5.6-.8z" />
    </svg>
  );
}

const MOCK_REVIEWS = [
  { name: "김O현", text: "설명해주신 대로 정확하게 진행됐고, 마무리도 깔끔했어요.", rating: 5 },
  { name: "이O영", text: "예약부터 시공까지 응답이 빨라서 편했습니다. 다음에도 이용할게요.", rating: 5 },
  { name: "박O수", text: "회원가 할인까지 받아서 만족스러웠어요. 추천합니다.", rating: 4 },
];

export default function CompanyProfilePage() {
  const params = useParams<{ id: string }>();
  const company = getMockCompany(params.id);

  if (!company) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <p className="font-semibold text-ink">업체를 찾을 수 없어요</p>
        <Link href="/zipservice/companies" className={`${secondaryButtonClass} mt-6 inline-block w-fit px-6`}>
          업체 목록으로
        </Link>
      </div>
    );
  }

  const meta = getCategoryMeta(company.category);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <Link href="/zipservice/companies" className="text-sm font-medium text-muted hover:text-brand-red">
        ← 업체 목록으로
      </Link>

      <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-white shadow-brand">
        <div
          className="h-28 w-full sm:h-36"
          style={{ background: `linear-gradient(120deg, ${company.gradient[0]}, ${company.gradient[1]})` }}
        />

        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          <div className="-mt-10 flex items-end gap-4 sm:-mt-12">
            <CompanyLogo
              name={company.name}
              gradient={company.gradient}
              className="h-20 w-20 rounded-2xl border-4 border-white text-3xl shadow-brand sm:h-24 sm:w-24"
            />
            <div className="pb-1">
              <span className="rounded-full bg-brand-red-soft px-2.5 py-1 text-xs font-semibold text-brand-red">
                {meta.label}
              </span>
            </div>
          </div>

          <h1 className="mt-4 text-2xl font-bold text-ink sm:text-3xl">{company.name}</h1>
          <p className="mt-1 break-keep text-base text-muted">{company.tagline}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/70">
            <span className="flex items-center gap-1 font-semibold text-ink">
              <StarIcon />
              {company.rating.toFixed(1)}
              <span className="font-normal text-muted">후기 {company.reviewCount}건</span>
            </span>
            <span>응답률 {company.responseRate}%</span>
            <span>{company.responseTimeLabel}</span>
            <span>{company.completedCount}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {company.highlightTags.map((tag) => (
              <span key={tag} className="rounded-full bg-brand-red-soft px-3 py-1.5 text-xs font-semibold text-brand-red">
                {tag}
              </span>
            ))}
          </div>

          <p className="mt-6 break-keep text-sm leading-relaxed text-ink/80">{company.description}</p>

          <dl className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-soft p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">서비스 지역</dt>
              <dd className="mt-0.5 font-medium text-ink">{company.regions.join(", ")}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">회원 혜택</dt>
              <dd className="mt-0.5 font-medium text-brand-green">{company.memberBenefit}</dd>
            </div>
          </dl>

          <div className="mt-6 space-y-3">
            <p className="text-sm font-semibold text-ink">이용 후기</p>
            {MOCK_REVIEWS.map((review) => (
              <div key={review.name} className="rounded-xl border border-line p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">{review.name}</p>
                  <div className="flex gap-0.5">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <StarIcon key={i} />
                    ))}
                  </div>
                </div>
                <p className="mt-1.5 break-keep text-sm text-muted">{review.text}</p>
              </div>
            ))}
          </div>

          <Link
            href={`/zipservice/new?category=${company.category}&company=${company.id}`}
            className="mt-8 flex w-full items-center justify-center rounded-full bg-brand-red px-6 py-3.5 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-red-dark"
          >
            이 업체에 견적요청
          </Link>
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        * 이 프로필은 디자인 검토를 위한 예시이며, 실제 입점 업체 정보가 아니에요.
      </p>
    </div>
  );
}
