import Link from "next/link";
import Icon, { type IconName } from "@/components/lifestyle/Icon";

export default function PromoBanner({
  eyebrow,
  title,
  subtitle,
  icon,
  accent,
  textClassName = "text-ink",
  cta,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon: IconName;
  accent: string;
  textClassName?: string;
  cta?: { label: string; href: string };
}) {
  const content = (
    <div className="relative flex items-center justify-between gap-6 overflow-hidden rounded-3xl px-6 py-8 sm:px-10" style={{ background: accent }}>
      <div>
        <p className={`text-xs font-semibold opacity-80 ${textClassName}`}>{eyebrow}</p>
        <p className={`mt-2 max-w-md break-keep text-xl font-extrabold sm:text-2xl ${textClassName}`}>{title}</p>
        {subtitle && <p className={`mt-2 max-w-md break-keep text-sm opacity-80 ${textClassName}`}>{subtitle}</p>}
      </div>
      <span className={`hidden h-20 w-20 shrink-0 opacity-90 sm:block ${textClassName}`}>
        <Icon name={icon} />
      </span>
    </div>
  );

  if (cta) {
    return (
      <Link href={cta.href} className="block transition hover:brightness-105">
        {content}
      </Link>
    );
  }
  return content;
}
