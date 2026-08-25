const STEPS = [
  {
    n: "1",
    title: "매물 등록",
    desc: "집을 팔고 싶은 회원이 집팔고에 매물 정보를 올립니다.",
  },
  {
    n: "2",
    title: "중개사 건당 결제",
    desc: "회원 공인중개사가 건당 결제로 매물 상세 정보를 열람하고 중개에 활용합니다.",
  },
  {
    n: "3",
    title: "매도 증빙 업로드",
    desc: "집이 팔리면 매도인이 계약서 등 증빙 서류를 업로드합니다.",
  },
  {
    n: "4",
    title: "정산금 지급",
    desc: "중개사가 결제했던 금액이 매물을 등록한 고객에게 그대로 지급됩니다.",
  },
];

export default function DoubleBenefit() {
  return (
    <section className="border-y border-line bg-soft">
      <div className="mx-auto max-w-[1600px] px-5 py-20 sm:px-10">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand-red">집팔고의 핵심 · 더블베네핏</p>
          <h2 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">
            매물을 올리기만 해도, 팔리면 보상까지
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            중개사가 매물 정보를 열람하기 위해 지불한 건당 결제 금액은, 실제로 집이 팔렸을 때
            매물을 등록한 고객에게 그대로 돌아갑니다. 중개사에게는 확실한 매물 정보를,
            매도인에게는 두 번째 보상을 — 그래서 더블베네핏입니다.
          </p>
        </div>

        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.n} className="relative rounded-2xl border border-line bg-white p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-red text-sm font-bold text-white">
                {step.n}
              </span>
              <p className="mt-4 font-semibold text-ink">{step.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.desc}</p>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-line lg:block"
                >
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
