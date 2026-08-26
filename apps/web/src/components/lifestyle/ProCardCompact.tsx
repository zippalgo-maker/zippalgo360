import Link from "next/link";
import type { MockCompany } from "@/lib/mock-companies";
import { getCategoryMeta } from "@/lib/lifestyle-data";
import { CATEGORY_GALLERY_ICONS } from "@/lib/mock-content";
import Icon from "@/components/lifestyle/Icon";

function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-amber-400">
      <path d="M10 1.6l2.5 5.1 5.6.8-4 4 1 5.6L10 14.5l-5 2.6 1-5.6-4-4 5.6-.8z" />
    </svg>
  );
}

export default function ProCardCompact({ company }: { company: MockCompany }) {
  const meta = getCategoryMeta(company.category);
  const galleryIcons = CATEGORY_GALLERY_ICONS[company.category];

  return (
    <Link
      href={`/zipservice/companies/${company.id}`}
      className="block w-72 shrink-0 rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-brand"
    >
      <p className="text-xs font-medium text-muted">{meta.label}</p>
      <p className="mt-1 truncate text-base font-bold text-ink">{company.name}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-ink/70">
        <StarIcon />
        {company.rating.toFixed(1)} ({company.reviewCount}) · {company.completedCount}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {galleryIcons.map((iconName, i) => (
          <div
            key={i}
            className="flex aspect-square items-center justify-center rounded-lg"
            style={{ background: `${company.gradient[i % 2]}1a` }}
          >
            <span className="h-5 w-5" style={{ color: company.gradient[i % 2] }}>
              <Icon name={iconName} />
            </span>
          </div>
        ))}
      </div>
    </Link>
  );
}
