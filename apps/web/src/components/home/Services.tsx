import Link from "next/link";
import { SERVICES } from "@/lib/services";

export default function Services() {
  return (
    <section id="services" className="mx-auto max-w-6xl px-5 py-20">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-brand-green">5 SERVICES, 1 MEMBERSHIP</p>
        <h2 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">
          집팔고360 안의 다섯 가지 서비스
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted">
          모든 서비스는 집팔고360 통합회원으로 연결됩니다. 하나만 가입해도 부동산 거래부터
          인테리어, 이사, 청소까지 이어서 이용할 수 있어요.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((service) => (
          <Link
            key={service.slug}
            href={service.href}
            className="group flex flex-col rounded-2xl border border-line bg-white p-6 transition hover:border-brand-green hover:shadow-brand"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green-soft text-base font-bold text-brand-green">
                {service.name.slice(0, 2)}
              </span>
              {service.status === "preparing" && (
                <span className="rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-muted">
                  준비중
                </span>
              )}
            </div>

            <p className="mt-4 text-lg font-bold text-ink">{service.name}</p>
            <p className="mt-1 text-sm font-medium text-brand-red">{service.tagline}</p>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{service.description}</p>

            <span className="mt-5 text-sm font-semibold text-brand-green group-hover:underline">
              {service.status === "live" ? "자세히 보기 →" : "관심 등록하기 →"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
