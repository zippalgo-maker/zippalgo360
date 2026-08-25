import Link from "next/link";
import { SERVICES } from "@/lib/services";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-soft">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div>
            <p className="text-lg font-extrabold text-brand-green">
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
                    <Link href={service.href} className="text-sm text-muted hover:text-brand-green">
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
                  <Link href="/register" className="text-sm text-muted hover:text-brand-green">
                    일반회원 가입
                  </Link>
                </li>
                <li>
                  <Link href="/register?type=company" className="text-sm text-muted hover:text-brand-green">
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
