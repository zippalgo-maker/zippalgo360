declare global {
  interface Window {
    kakao: any;
  }
}

let loadPromise: Promise<void> | null = null;

export function loadKakaoMaps(appKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("카카오맵은 브라우저에서만 사용할 수 있습니다."));
  }
  if (window.kakao?.maps) {
    return Promise.resolve();
  }
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => resolve());
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("카카오맵 스크립트를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export {};
