import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand-green-soft">
      <div className="mx-auto flex max-w-6xl flex-col items-start px-5 py-20 sm:py-28">
        <p className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-brand-green shadow-sm">
          HOME LIFECYCLE PLATFORM
        </p>

        <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-tight text-brand-green sm:text-5xl">
          집을 팔고, 사고, 꾸미고
          <br />
          <span className="text-brand-red">집팔고360</span>에서 한번에
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-ink/70 sm:text-lg">
          부동산 거래에서 주거 생활까지 연결하는 라이프사이클 플랫폼. 하나의 회원가입으로
          집팔고, 집사고, 집테리어, 집이사, 집청소를 모두 이용하세요.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="rounded-full bg-brand-green px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-green-2"
          >
            무료로 시작하기
          </Link>
          <Link
            href="#services"
            className="rounded-full border border-brand-green/20 bg-white px-7 py-3.5 text-sm font-semibold text-brand-green transition hover:border-brand-green"
          >
            서비스 둘러보기
          </Link>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-green/10 blur-3xl sm:h-96 sm:w-96"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 right-1/4 h-56 w-56 rounded-full bg-brand-red/10 blur-3xl"
      />
    </section>
  );
}
