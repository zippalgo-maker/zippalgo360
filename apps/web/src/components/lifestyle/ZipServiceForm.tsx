"use client";

import { useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { cardClass, errorTextClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";

type ServiceCategory =
  | "moving"
  | "move_out_cleaning"
  | "living_cleaning"
  | "appliance"
  | "furniture"
  | "subscription";

const CATEGORIES: { value: ServiceCategory; label: string; description: string }[] = [
  { value: "moving", label: "이사", description: "포장이사·용달이사 업체 매칭" },
  { value: "move_out_cleaning", label: "이사청소", description: "입주 전/퇴거 후 청소" },
  { value: "living_cleaning", label: "생활청소", description: "정기·수시 방문 청소" },
  { value: "appliance", label: "가전", description: "평형·스타일 맞춤 AI 추천" },
  { value: "furniture", label: "가구", description: "평형·스타일 맞춤 AI 추천" },
  { value: "subscription", label: "인터넷·TV·정수기", description: "생활 구독 서비스 신청" },
];

const HOME_STYLES = ["모던", "미니멀", "내추럴", "북유럽풍", "클래식", "기타"];

export default function ZipServiceForm() {
  const [category, setCategory] = useState<ServiceCategory>("moving");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [desiredDate, setDesiredDate] = useState("");
  const [pyeong, setPyeong] = useState("");
  const [homeStyle, setHomeStyle] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const needsHomeContext = category === "appliance" || category === "furniture";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiFetch("/lifestyle/interest", {
        method: "POST",
        body: {
          service_type: category,
          name,
          phone,
          region,
          desired_date: desiredDate || undefined,
          memo: memo || undefined,
          pyeong: needsHomeContext && pyeong ? Number(pyeong) : undefined,
          home_style: needsHomeContext && homeStyle ? homeStyle : undefined,
        },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className={`${cardClass} mt-8`}>
        <p className="font-semibold text-ink">관심 등록이 완료됐어요!</p>
        <p className="mt-1 text-sm text-muted">서비스가 오픈하면 남겨주신 연락처로 안내드릴게요.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`${cardClass} mt-8 space-y-5`}>
      <div className="space-y-1.5">
        <label className={labelClass}>어떤 서비스가 필요하세요?</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`rounded-xl border p-3 text-left transition ${
                category === c.value
                  ? "border-brand-red bg-brand-red-soft"
                  : "border-line hover:border-brand-red"
              }`}
            >
              <p className="text-sm font-semibold text-ink">{c.label}</p>
              <p className="mt-0.5 break-keep text-xs text-muted">{c.description}</p>
            </button>
          ))}
        </div>
      </div>

      {needsHomeContext && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="pyeong">
              평형 (선택)
            </label>
            <input
              id="pyeong"
              type="number"
              className={inputClass}
              value={pyeong}
              onChange={(e) => setPyeong(e.target.value)}
              placeholder="예: 32"
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="homeStyle">
              선호 스타일 (선택)
            </label>
            <select id="homeStyle" className={inputClass} value={homeStyle} onChange={(e) => setHomeStyle(e.target.value)}>
              <option value="">선택 안 함</option>
              {HOME_STYLES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>
          <p className="col-span-2 text-xs text-muted">
            평형과 선호 스타일을 남겨주시면, 오픈 후 AI가 우리 집에 맞는 가전·가구를 추천해드려요.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <label className={labelClass} htmlFor="name">
          이름
        </label>
        <input id="name" required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <label className={labelClass} htmlFor="phone">
          휴대폰 번호
        </label>
        <input
          id="phone"
          required
          className={inputClass}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-0000-0000"
        />
      </div>
      <div className="space-y-1.5">
        <label className={labelClass} htmlFor="region">
          희망 지역
        </label>
        <input
          id="region"
          required
          className={inputClass}
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="서울특별시 강남구"
        />
      </div>
      <div className="space-y-1.5">
        <label className={labelClass} htmlFor="desiredDate">
          희망 일정 (선택)
        </label>
        <input
          id="desiredDate"
          type="date"
          className={inputClass}
          value={desiredDate}
          onChange={(e) => setDesiredDate(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label className={labelClass} htmlFor="memo">
          남기고 싶은 말 (선택)
        </label>
        <textarea id="memo" rows={3} className={inputClass} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>

      {error && <p className={errorTextClass}>{error}</p>}

      <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
        {isSubmitting ? "등록 중..." : "관심 등록하기"}
      </button>
    </form>
  );
}
