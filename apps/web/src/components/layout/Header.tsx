"use client";

import Link from "next/link";
import { useState } from "react";
import { SERVICES } from "@/lib/services";
import { useAuth } from "@/lib/auth-context";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-1 text-xl font-extrabold tracking-tight text-brand-green">
          집팔고<span className="text-brand-red">360</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {SERVICES.map((service) => (
            <Link
              key={service.slug}
              href={service.href}
              className="text-sm font-medium text-ink/80 transition hover:text-brand-green"
            >
              {service.name}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isLoading ? null : user ? (
            <>
              <Link
                href="/mypage"
                className="text-sm font-medium text-ink/80 transition hover:text-brand-green"
              >
                {user.name}님
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-brand-green hover:text-brand-green"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-ink/80 transition hover:text-brand-green"
              >
                로그인
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green-2"
              >
                회원가입
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line md:hidden"
          aria-label="메뉴 열기"
        >
          <span className="sr-only">메뉴</span>
          <div className="space-y-1">
            <span className="block h-0.5 w-4 bg-ink" />
            <span className="block h-0.5 w-4 bg-ink" />
            <span className="block h-0.5 w-4 bg-ink" />
          </div>
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-line bg-background px-5 py-4 md:hidden">
          <ul className="flex flex-col gap-3">
            {SERVICES.map((service) => (
              <li key={service.slug}>
                <Link
                  href={service.href}
                  className="block py-1 text-sm font-medium text-ink/80"
                  onClick={() => setMenuOpen(false)}
                >
                  {service.name}
                </Link>
              </li>
            ))}
            <li className="flex gap-3 pt-2">
              {user ? (
                <>
                  <Link
                    href="/mypage"
                    className="flex-1 rounded-full border border-line py-2 text-center text-sm font-medium"
                    onClick={() => setMenuOpen(false)}
                  >
                    {user.name}님
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                    className="flex-1 rounded-full bg-brand-green py-2 text-center text-sm font-semibold text-white"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex-1 rounded-full border border-line py-2 text-center text-sm font-medium"
                    onClick={() => setMenuOpen(false)}
                  >
                    로그인
                  </Link>
                  <Link
                    href="/register"
                    className="flex-1 rounded-full bg-brand-green py-2 text-center text-sm font-semibold text-white"
                    onClick={() => setMenuOpen(false)}
                  >
                    회원가입
                  </Link>
                </>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
