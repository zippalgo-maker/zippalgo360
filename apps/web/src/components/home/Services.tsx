import Image from "next/image";
import Link from "next/link";
import { SERVICES } from "@/lib/services";

export default function Services() {
  const featured = SERVICES.filter((s) => s.status === "live");
  const preparing = SERVICES.filter((s) => s.status === "preparing");

  return (
    <section id="services" className="mx-auto max-w-[1600px] px-5 py-14 sm:px-10">
      <h2 className="text-center text-2xl font-black tracking-tight text-ink sm:text-3xl">
        집팔고360으로 무엇을 도와드릴까요?
      </h2>

      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-[1.3fr_1.3fr_1.3fr_0.85fr_0.85fr]">
        {featured.map((service, i) => (
          <article
            key={service.slug}
            className={`flex flex-col rounded-xl border bg-white p-5 shadow-sm ${
              i === 0 ? "border-[1.5px] border-brand-red" : "border-line"
            }`}
          >
            <div className="flex flex-1 gap-4">
              <div className="flex h-[62px] w-[62px] flex-none items-center justify-center">
                <Image src={service.icon} alt="" width={50} height={50} className="object-contain" />
              </div>
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-lg font-extrabold text-ink">
                  {service.name}
                  <span className="rounded-full bg-brand-red-soft px-2 py-1 text-[10px] font-bold text-brand-red">
                    운영 중
                  </span>
                </h3>
                <strong className="mt-1.5 block text-sm text-ink">{service.tagline}</strong>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{service.description}</p>
              </div>
            </div>
            <Link
              href={service.href}
              className={`mt-4 flex h-11 items-center justify-center rounded-lg text-sm font-extrabold ${
                i === 0
                  ? "bg-gradient-to-b from-[#d80b20] to-[#c00017] text-white"
                  : "border-[1.3px] border-brand-red text-brand-red"
              }`}
            >
              {service.ctaLabel}
            </Link>
          </article>
        ))}

        {preparing.map((service) => (
          <article
            key={service.slug}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-white p-5 text-center text-muted"
          >
            <div className="flex h-14 w-14 items-center justify-center opacity-70">
              <Image src={service.icon} alt="" width={44} height={44} className="object-contain" />
            </div>
            <h3 className="text-lg font-extrabold text-ink">{service.name}</h3>
            <span className="rounded-full bg-soft px-2.5 py-1 text-[11px] font-bold text-muted">
              서비스 예정
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
