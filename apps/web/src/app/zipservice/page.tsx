import ZipServiceForm from "@/components/lifestyle/ZipServiceForm";

export default function ZipServicePage() {
  return (
    <section className="bg-brand-red-soft">
      <div className="mx-auto max-w-xl px-5 py-20">
        <p className="text-sm font-semibold text-brand-red">집서비스</p>
        <h1 className="mt-3 text-3xl font-extrabold text-brand-red sm:text-4xl">
          이사부터 생활까지, 집의 모든 순간
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink/70">
          이사, 이사청소, 생활청소는 물론 내 집 평형과 스타일에 맞는 가전·가구를 AI가
          추천해주고, 인터넷·TV·정수기 같은 생활 구독 서비스까지 집팔고360에서 한 번에
          해결할 수 있도록 준비하고 있습니다.
        </p>
        <p className="mt-2 text-sm font-medium text-brand-red">
          아직 준비 중인 서비스예요. 관심 등록을 남겨주시면 오픈 소식을 가장 먼저 안내드릴게요.
        </p>

        <ZipServiceForm />
      </div>
    </section>
  );
}
