import Image from "next/image";
import SectionHeading from "@/components/lifestyle/SectionHeading";
import Icon from "@/components/lifestyle/Icon";
import { MAGAZINE_STORIES } from "@/lib/mock-content";
import { PHOTOS } from "@/lib/lifestyle-photos";

export default function MagazineStoriesSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <SectionHeading eyebrow="읽을거리" title="집서비스 이야기" moreHref="/zipservice/companies" />

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        {MAGAZINE_STORIES.map((story) => (
          <div key={story.articleTitle}>
            <div
              className="relative flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-2xl p-5 text-white"
              style={{ background: story.accent }}
            >
              {story.photo ? (
                <>
                  <Image src={PHOTOS[story.photo]} alt="" fill sizes="360px" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/10" />
                </>
              ) : (
                <span className="absolute -bottom-3 -right-3 h-24 w-24 opacity-20">
                  <Icon name={story.icon} />
                </span>
              )}
              <p className="relative z-10 text-xs font-bold opacity-80">{story.label}</p>
              <p className="relative z-10 max-w-[70%] break-keep text-lg font-extrabold leading-snug">{story.teaser}</p>
            </div>
            <p className="mt-3 break-keep font-semibold text-ink">{story.articleTitle}</p>
            <p className="mt-1 line-clamp-2 break-keep text-sm text-muted">{story.snippet}</p>
            <p className="mt-2 flex items-center gap-1 text-xs text-muted">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-3.5 w-3.5">
                <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" strokeLinejoin="round" />
                <circle cx="10" cy="10" r="2.2" />
              </svg>
              {story.views.toLocaleString("ko-KR")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
