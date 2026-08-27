import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/lifestyle/Icon";
import type { PortfolioCollage } from "@/lib/mock-content";
import { PHOTOS } from "@/lib/lifestyle-photos";

export default function PortfolioCollageCard({ collage }: { collage: PortfolioCollage }) {
  return (
    <Link href={`/zipservice/companies/${collage.companyId}`} className="group block">
      <div className="grid aspect-[16/10] grid-cols-2 gap-1.5 overflow-hidden rounded-2xl">
        <div className="relative row-span-2 flex items-center justify-center overflow-hidden" style={{ background: collage.accent }}>
          {collage.photos?.[0] ? (
            <Image src={PHOTOS[collage.photos[0]]} alt="" fill sizes="280px" className="object-cover" />
          ) : (
            <span className="h-14 w-14 text-white/90">
              <Icon name={collage.icons[0]} />
            </span>
          )}
        </div>
        <div className="relative flex items-center justify-center overflow-hidden" style={{ background: `${collage.accent}cc` }}>
          {collage.photos?.[1] ? (
            <Image src={PHOTOS[collage.photos[1]]} alt="" fill sizes="140px" className="object-cover" />
          ) : (
            <span className="h-8 w-8 text-white/90">
              <Icon name={collage.icons[1]} />
            </span>
          )}
        </div>
        <div className="relative flex items-center justify-center overflow-hidden" style={{ background: `${collage.accent}99` }}>
          {collage.photos?.[2] ? (
            <Image src={PHOTOS[collage.photos[2]]} alt="" fill sizes="140px" className="object-cover" />
          ) : (
            <span className="h-8 w-8 text-white/90">
              <Icon name={collage.icons[2]} />
            </span>
          )}
        </div>
      </div>
      <p className="mt-2 font-semibold text-ink">{collage.title}</p>
      <p className="mt-0.5 text-xs text-muted">{collage.subtitle}</p>
    </Link>
  );
}
