import SectionHeading from "@/components/lifestyle/SectionHeading";
import { POPULAR_REVIEWS } from "@/lib/mock-content";

export default function PopularReviewsSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <SectionHeading eyebrow="이번 주 많이 본" title="집서비스 인기 후기" moreHref="/zipservice/companies" />

      <div className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
        {POPULAR_REVIEWS.map((review) => (
          <div key={review.rank} className="flex items-start gap-3">
            <span className="w-5 shrink-0 text-lg font-extrabold text-brand-red">{review.rank}</span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{review.title}</p>
              <p className="mt-0.5 truncate text-sm text-muted">{review.snippet}</p>
              <p className="mt-1 text-xs text-muted">
                좋아요 {review.likes} · 댓글 {review.comments}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
