import Link from "next/link";

export default function CtaBanner() {
  return (
    <section className="bg-brand-green">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-16 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            지금 집팔고360 회원이 되어보세요
          </h2>
          <p className="mt-2 text-sm text-white/80">
            일반회원과 공인중개사 회원가입 모두 무료입니다.
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-3">
          <Link
            href="/register"
            className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-brand-green transition hover:bg-brand-green-soft"
          >
            일반회원 가입
          </Link>
          <Link
            href="/register?type=company"
            className="rounded-full border border-white/40 px-7 py-3.5 text-sm font-semibold text-white transition hover:border-white"
          >
            공인중개사 가입
          </Link>
        </div>
      </div>
    </section>
  );
}
