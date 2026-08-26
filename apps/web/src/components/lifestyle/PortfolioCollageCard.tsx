import Link from "next/link";
import Icon from "@/components/lifestyle/Icon";
import type { PortfolioCollage } from "@/lib/mock-content";

export default function PortfolioCollageCard({ collage }: { collage: PortfolioCollage }) {
  return (
    <Link href={`/zipservice/companies/${collage.companyId}`} className="group block">
      <div className="grid aspect-[16/10] grid-cols-2 gap-1.5 overflow-hidden rounded-2xl">
        <div className="row-span-2 flex items-center justify-center" style={{ background: collage.accent }}>
          <span className="h-14 w-14 text-white/90">
            <Icon name={collage.icons[0]} />
          </span>
        </div>
        <div className="flex items-center justify-center" style={{ background: `${collage.accent}cc` }}>
          <span className="h-8 w-8 text-white/90">
            <Icon name={collage.icons[1]} />
          </span>
        </div>
        <div className="flex items-center justify-center" style={{ background: `${collage.accent}99` }}>
          <span className="h-8 w-8 text-white/90">
            <Icon name={collage.icons[2]} />
          </span>
        </div>
      </div>
      <p className="mt-2 font-semibold text-ink">{collage.title}</p>
      <p className="mt-0.5 text-xs text-muted">{collage.subtitle}</p>
    </Link>
  );
}
