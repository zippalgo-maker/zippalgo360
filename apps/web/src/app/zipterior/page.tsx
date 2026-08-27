"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// zipterior.zippalgo360.com은 zipterior.kr과 동일한 서버/백엔드를 서빙하는
// 서브도메인(<서비스>.zippalgo360.com 네이밍 규칙). zippalgo360.com과
// eTLD+1이 같아 iframe 안에서도 same-site로 취급되므로, zipterior.kr을
// 직접 넣을 때 발생하는 제3자 쿠키 문제(로그인 세션 유지 실패)를 피할 수 있다.
const ZIPTERIOR_URL = "https://zipterior.zippalgo360.com";
// 모바일 기기는 zipterior.kr/m과 동일한 모바일 전용 경로(/m)로 그대로
// iframe 임베드한다(견적요청/포트폴리오/MY집테리어 탭 등 우리 쪽에
// 아직 없는 기능이 많아 모바일 앱 셸은 유지). PC는 아래에서 /map으로
// 리다이렉트하므로 이 경로를 안 씀.
const MOBILE_USER_AGENT_RE = /Android|iPhone|iPad|iPod|Mobi/i;

// 집테리어 서버가 이 파라미터로 "집팔고360 안에 임베드된 화면"임을 인식해
// 자기 로고(.brand-box)를 숨긴다(zipterior.kr/zipterior.zippalgo360.com에
// 직접 접속하면 이 파라미터가 없어 로고가 그대로 보임) — 집테리어 저장소
// index.html의 zpEmbed 감지 스크립트와 짝을 이루는 값.
function buildMobileEmbedUrl(ssoCode?: string) {
  const params = new URLSearchParams({ zpEmbed: "1" });
  if (ssoCode) params.set("sso", ssoCode);
  return `${ZIPTERIOR_URL}/m?${params.toString()}`;
}

export default function ZipteriorEmbedPage() {
  const { token, isLoading } = useAuth();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [iframeSrc, setIframeSrc] = useState(buildMobileEmbedUrl());

  useEffect(() => {
    const mobile = MOBILE_USER_AGENT_RE.test(navigator.userAgent);
    setIsMobile(mobile);

    // PC는 더 이상 zipterior 자체 사이트를 iframe으로 보여주지 않고,
    // 우리 /map 페이지의 인테리어 모드로 보낸다 — 지도 화면 디자인을
    // zippalgo360.com/map과 100% 동일하게 만들어달라는 요청에 대한
    // 유일하게 확실한 방법(같은 코드를 그대로 재사용). 로그인/회원사/
    // 관리자 메뉴 등 zipterior 자체 계정 기능은 이 화면에서 빠진다.
    if (!mobile) {
      router.replace("/map?mode=interior");
      return;
    }

    if (isLoading || !token) {
      setIframeSrc(buildMobileEmbedUrl());
      return;
    }

    // 로그인된 사용자라면 집팔고360 계정으로 집테리어에도 로그인되도록
    // 1회용 SSO 코드를 발급받아 iframe에 넘긴다. 코드는 짧게 만료되고
    // (기본 30초) 발급 실패 시에도 iframe 자체는 그대로 뜨게 조용히
    // 폴백한다 — 집테리어의 자체 로그인 화면으로 이어질 뿐 깨지지 않음.
    let cancelled = false;
    apiFetch<{ code: string }>("/auth/sso/issue-code", { method: "POST", token })
      .then(({ code }) => {
        if (!cancelled) setIframeSrc(buildMobileEmbedUrl(code));
      })
      .catch(() => {
        if (!cancelled) setIframeSrc(buildMobileEmbedUrl());
      });

    return () => {
      cancelled = true;
    };
  }, [token, isLoading, router]);

  if (isMobile === null || !isMobile) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center text-sm text-muted">
        이동 중...
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <iframe
        src={iframeSrc}
        title="집테리어"
        className="h-full w-full border-0"
        allow="geolocation"
      />
    </div>
  );
}
