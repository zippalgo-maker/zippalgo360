"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import Icon, { type IconName } from "@/components/lifestyle/Icon";
import { PHOTOS, type PhotoKey } from "@/lib/lifestyle-photos";

function BookmarkIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.6} className="h-4 w-4">
      <path d="M5 3.5h10a1 1 0 0 1 1 1V17l-6-3.5L4 17V4.5a1 1 0 0 1 1-1z" strokeLinejoin="round" />
    </svg>
  );
}

export default function PhotoCard({
  icon,
  photo,
  title,
  subtitle,
  accent,
  href,
  bookmark = true,
}: {
  icon: IconName;
  photo?: PhotoKey;
  title: string;
  subtitle?: string;
  accent: string;
  href?: string;
  bookmark?: boolean;
}) {
  const [saved, setSaved] = useState(false);

  const tile = (
    <div className="relative aspect-square overflow-hidden rounded-2xl transition group-hover:brightness-95" style={{ background: accent }}>
      {photo ? (
        <Image src={PHOTOS[photo]} alt="" fill sizes="280px" className="object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="h-11 w-11 text-white/90">
            <Icon name={icon} />
          </span>
        </div>
      )}
      {bookmark && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setSaved((s) => !s);
          }}
          className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow transition ${
            saved ? "text-brand-red" : "text-ink/60"
          }`}
          aria-label="저장"
        >
          <BookmarkIcon active={saved} />
        </button>
      )}
    </div>
  );

  const caption = (
    <>
      <p className="mt-2 line-clamp-2 break-keep text-sm font-semibold text-ink">{title}</p>
      {subtitle && <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="group block">
        {tile}
        {caption}
      </Link>
    );
  }

  return (
    <div>
      {tile}
      {caption}
    </div>
  );
}
