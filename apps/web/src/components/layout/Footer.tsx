"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SERVICES } from "@/lib/services";

// /map, /zipterior는 헤더 높이를 뺀 나머지 뷰포트를 지도가 정확히 꽉
// 채우도록 만든 전체화면 앱 화면이라(h-[calc(100vh-4rem)]), 그 아래에
// 푸터까지 붙으면 문서 전체 높이가 뷰포트를 넘겨 스크롤이 생기고
// 지도가 화면에 딱 안 맞아 보인다 — 이 두 라우트에서는 푸터를 아예
// 렌더링하지 않는다.
const FULLSCREEN_ROUTE_PREFIXES = ["/map", "/zipterior"];

export default function Footer() {
  const pathname = usePathname();
  if (FULLSCREEN_ROUTE_PREFIXES.some((prefix) => pathname?.startsWith(prefix))) {
    return null;
  }

  return (
    <footer className="border-t border-line bg-soft">
      <div className="mx-auto max-w-[1600px] px-5 py-12 sm:px-10">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div>
            <p className="text-lg font-extrabold text-ink">
              집팔고<span className="text-brand-red">360</span>
            </p>
            <p className="mt-2 max-w-sm text-sm text-muted">
              부동산 거래에서 주거 생활까지 연결하는 Home Lifecycle Platform
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-ink">서비스</p>
              <ul className="mt-3 space-y-2">
                {SERVICES.map((service) => (
                  <li key={service.slug}>
                    <Link href={service.href} className="text-sm text-muted hover:text-brand-red">
                      {service.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">회원</p>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/register" className="text-sm text-muted hover:text-brand-red">
                    일반회원 가입
                  </Link>
                </li>
                <li>
                  <Link href="/register?type=company" className="text-sm text-muted hover:text-brand-red">
                    공인중개사 가입
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-10 text-xs text-muted">
          © {new Date().getFullYear()} 집팔고360. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
