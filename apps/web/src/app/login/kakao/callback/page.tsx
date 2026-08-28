"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getKakaoRedirectUri } from "@/lib/kakao";
import { errorTextClass } from "@/lib/ui";

function KakaoCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithKakao } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const kakaoError = searchParams.get("error");
    if (kakaoError) {
      setError("카카오 로그인이 취소되었습니다.");
      return;
    }

    const code = searchParams.get("code");
    if (!code) {
      setError("카카오 인증 정보를 받지 못했습니다.");
      return;
    }

    loginWithKakao(code, getKakaoRedirectUri())
      .then(() => router.replace("/mypage"))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "카카오 로그인에 실패했습니다.");
      });
  }, [searchParams, loginWithKakao, router]);

  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      {error ? (
        <>
          <p className={errorTextClass}>{error}</p>
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="mt-4 text-sm font-semibold text-brand-red"
          >
            로그인 화면으로 돌아가기
          </button>
        </>
      ) : (
        <p className="text-sm text-muted">카카오 로그인 처리 중입니다...</p>
      )}
    </div>
  );
}

export default function KakaoCallbackPage() {
  return (
    <Suspense>
      <KakaoCallbackHandler />
    </Suspense>
  );
}
