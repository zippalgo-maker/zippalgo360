"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// zipterior.zippalgo360.com은 zipterior.kr과 동일한 서버/백엔드를 서빙하는
// 서브도메인(<서비스>.zippalgo360.com 네이밍 규칙). zippalgo360.com과
// eTLD+1이 같아 iframe 안에서도 same-site로 취급되므로, zipterior.kr을
// 직접 넣을 때 발생하는 제3자 쿠키 문제(로그인 세션 유지 실패)를 피할 수 있다.
const ZIPTERIOR_URL = "https://zipterior.zippalgo360.com";

export default function ZipteriorEmbedPage() {
  const { token, isLoading } = useAuth();
  const [iframeSrc, setIframeSrc] = useState(ZIPTERIOR_URL);

  useEffect(() => {
    if (isLoading || !token) {
      setIframeSrc(ZIPTERIOR_URL);
      return;
    }

    // 로그인된 사용자라면 집팔고360 계정으로 집테리어에도 로그인되도록
    // 1회용 SSO 코드를 발급받아 iframe에 넘긴다. 코드는 짧게 만료되고
    // (기본 30초) 발급 실패 시에도 iframe 자체는 그대로 뜨게 조용히
    // 폴백한다 — 집테리어의 자체 로그인 화면으로 이어질 뿐 깨지지 않음.
    let cancelled = false;
    apiFetch<{ code: string }>("/auth/sso/issue-code", { method: "POST", token })
      .then(({ code }) => {
        if (!cancelled) setIframeSrc(`${ZIPTERIOR_URL}/?sso=${encodeURIComponent(code)}`);
      })
      .catch(() => {
        if (!cancelled) setIframeSrc(ZIPTERIOR_URL);
      });

    return () => {
      cancelled = true;
    };
  }, [token, isLoading]);

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <iframe
        src={iframeSrc}
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
