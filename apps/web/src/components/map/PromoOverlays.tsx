"use client";

import { useState } from "react";
import Image from "next/image";

// 지도 화면 우하단 배너 + 가운데 모달 — 마케팅팀이 만든 실제 배너
// 이미지를 그대로 쓴다(2026-08-28, Design Canvas 목업에서 그대로
// 옮김). 이미지 자체에 문구/버튼이 그려져 있어서, 실제 클릭 가능한
// 영역은 이미지 위에 투명 오버레이로만 얹는다.
export default function PromoOverlays() {
  const [cornerVisible, setCornerVisible] = useState(true);
  const [modalVisible, setModalVisible] = useState(true);

  return (
    <>
      {cornerVisible && (
        <div className="absolute bottom-4 right-4 z-[25] w-[30rem]">
          <div className="relative overflow-hidden rounded-[20px] shadow-2xl">
            <Image
              src="/images/promo/zippalgo-ai-banner.webp"
              alt="집팔고AI로 원하는 아파트를 찾아드려요"
              width={1630}
              height={965}
              className="block h-auto w-full"
              priority={false}
            />
            <div className="absolute inset-x-0 bottom-0 flex h-[16.6%]">
              <button
                type="button"
                aria-label="오늘 하루 보지 않기"
                onClick={() => setCornerVisible(false)}
                className="flex-1"
              />
              <button type="button" aria-label="배너 닫기" onClick={() => setCornerVisible(false)} className="flex-1" />
            </div>
          </div>
        </div>
      )}

      {modalVisible && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55">
          <div className="relative w-[30rem] overflow-hidden rounded-[20px] shadow-2xl">
            <Image
              src="/images/promo/zipterior-modal.webp"
              alt="집테리어 — 시공사례부터 견적까지 한번에"
              width={1254}
              height={1254}
              className="block h-auto w-full"
              priority={false}
            />
            <div className="absolute inset-x-0 bottom-0 flex h-[8%]">
              <button type="button" aria-label="오늘 하루 안볼래요" onClick={() => setModalVisible(false)} className="flex-1" />
              <button type="button" aria-label="모달 닫기" onClick={() => setModalVisible(false)} className="flex-1" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
