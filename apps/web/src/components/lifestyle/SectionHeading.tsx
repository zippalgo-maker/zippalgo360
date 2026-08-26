import Link from "next/link";

export default function SectionHeading({
  eyebrow,
  title,
  moreHref,
}: {
  eyebrow?: string;
  title: string;
  moreHref?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-sm font-semibold text-brand-red">{eyebrow}</p>}
        <h2 className={`${eyebrow ? "mt-2" : ""} text-xl font-bold text-ink sm:text-2xl`}>{title}</h2>
      </div>
      {moreHref && (
        <Link href={moreHref} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-muted hover:text-brand-red">
          더보기
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M7.3 4.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4L11.6 10 7.3 5.7a1 1 0 0 1 0-1.4z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
      )}
    </div>
  );
}
