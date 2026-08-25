"use client";

// interior.zippalgo360.com은 zipterior.kr과 동일한 서버/백엔드를 서빙하는
// 서브도메인. zippalgo360.com과 eTLD+1이 같아 iframe 안에서도 same-site로
// 취급되므로, zipterior.kr을 직접 넣을 때 발생하는 제3자 쿠키 문제(로그인 세션
// 유지 실패)를 피할 수 있다.
const ZIPTERIOR_URL = "https://interior.zippalgo360.com";

export default function JipteriorEmbedPage() {
  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <iframe
        src={ZIPTERIOR_URL}
        title="집테리어"
        className="h-full w-full border-0"
        allow="geolocation"
      />
      <a
        href={ZIPTERIOR_URL}
        target="_blank"
        rel="noreferrer"
        className="absolute right-4 top-4 z-10 rounded-full border border-line bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink/70 shadow-md transition hover:text-brand-red"
      >
        새 탭에서 열기 ↗
      </a>
    </div>
  );
}
