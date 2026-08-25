import Link from "next/link";

const FEATURES = [
  {
    label: "고객 요청 확인",
    icon: (
      <>
        <circle cx="14" cy="8" r="5" />
        <path d="M4 25c.7-7 4-10 10-10s9.3 3 10 10" />
      </>
    ),
  },
  {
    label: "제안 관리",
    icon: (
      <>
        <path d="M7 4h14v20H7zM10 2h8v5h-8zM10 11h8M10 15h8M10 19h5" />
      </>
    ),
  },
  {
    label: "계약·정산",
    icon: (
      <>
        <path d="M7 3h12l4 4v18H7zM19 3v5h5M11 13h8M11 17h5" />
        <circle cx="20" cy="20" r="4" />
        <path d="m18.5 20 1 1 2-2" />
      </>
    ),
  },
  {
    label: "성과 리포트",
    icon: (
      <>
        <path d="M4 24V13M10 24V8M16 24V16M22 24V4M3 24h22" />
        <path d="m5 10 5-4 6 5 7-8" />
      </>
    ),
  },
];

export default function PartnerStrip() {
  return (
    <section className="mx-auto mb-10 max-w-[1600px] px-5 sm:px-10">
      <div className="grid gap-6 rounded-xl border border-[#eadfce] bg-[#fffdf9] p-6 sm:grid-cols-[1.3fr_0.65fr_2fr] sm:items-center sm:p-8">
        <div className="flex flex-col gap-1">
          <strong className="text-lg text-ink">파트너이신가요?</strong>
          <span className="text-sm text-muted">중개사·인테리어 파트너가 고객과 업무를 관리하는 공간</span>
        </div>

        <Link
          href="/partners"
          className="flex h-12 items-center justify-center rounded-lg border-[1.5px] border-brand-red text-sm font-extrabold text-brand-red"
        >
          파트너 센터 시작하기
        </Link>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:justify-between">
          {FEATURES.map((f, i) => (
            <span key={f.label} className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-ink">
              <svg viewBox="0 0 28 28" className="h-6 w-6 stroke-ink stroke-[1.8]" fill="none" strokeLinecap="round" strokeLinejoin="round">
                {f.icon}
              </svg>
              {f.label}
              {i < FEATURES.length - 1 && <i className="ml-4 hidden h-5 w-px bg-line sm:block" aria-hidden />}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
