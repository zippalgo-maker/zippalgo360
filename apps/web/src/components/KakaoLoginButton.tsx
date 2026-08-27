"use client";

import { getKakaoAuthorizeUrl } from "@/lib/kakao";
import { kakaoButtonClass } from "@/lib/ui";

export function KakaoLoginButton() {
  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = getKakaoAuthorizeUrl();
      }}
      className={kakaoButtonClass}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path
          d="M9 1.5C4.31 1.5 0.5 4.42 0.5 8.02c0 2.31 1.57 4.34 3.94 5.5-.17.63-.63 2.33-.72 2.69-.11.44.16.44.34.32.14-.1 2.24-1.52 3.15-2.14.42.06.85.09 1.29.09 4.69 0 8.5-2.92 8.5-6.52S13.69 1.5 9 1.5Z"
          fill="#191600"
        />
      </svg>
      카카오로 시작하기
    </button>
  );
}
