"use client";

import { useRef, useState, type ReactNode } from "react";

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 ${direction === "left" ? "rotate-180" : ""}`}>
      <path
        fillRule="evenodd"
        d="M7.3 4.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4L11.6 10 7.3 5.7a1 1 0 0 1 0-1.4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function ScrollRow({ children, itemWidth = 288 }: { children: ReactNode; itemWidth?: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function updateArrows() {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  function scrollBy(direction: "left" | "right") {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -itemWidth * 2 : itemWidth * 2, behavior: "smooth" });
    setTimeout(updateArrows, 300);
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={updateArrows}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy("left")}
          className="absolute left-0 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white shadow-brand lg:flex"
          style={{ width: 36, height: 36 }}
          aria-label="이전"
        >
          <ChevronIcon direction="left" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollBy("right")}
          className="absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-line bg-white shadow-brand lg:flex"
          style={{ width: 36, height: 36 }}
          aria-label="다음"
        >
          <ChevronIcon direction="right" />
        </button>
      )}
    </div>
  );
}
