"use client";

const ZIPTERIOR_URL = "https://zipterior.kr";

export default function JipteriorEmbedPage() {
  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <iframe
        src={ZIPTERIOR_URL}
        title="집테리어"
        className="h-full w-full border-0"
        allow="geolocation"
      />
      <a
        href={ZIPTERIOR_URL}
        target="_blank"
        rel="noreferrer"
        className="absolute right-4 top-4 z-10 rounded-full border border-line bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink/70 shadow-md transition hover:text-brand-red"
      >
        새 탭에서 열기 ↗
      </a>
    </div>
  );
}
