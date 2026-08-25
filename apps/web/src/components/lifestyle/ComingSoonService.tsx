"use client";

import { useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { cardClass, errorTextClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";

interface Props {
  serviceType: "moving" | "cleaning";
  badge: string;
  title: string;
  description: string;
}

export default function ComingSoonService({ serviceType, badge, title, description }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [desiredDate, setDesiredDate] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiFetch("/lifestyle/interest", {
        method: "POST",
        body: {
          service_type: serviceType,
          name,
          phone,
          region,
          desired_date: desiredDate || undefined,
          memo: memo || undefined,
        },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="bg-brand-green-soft">
      <div className="mx-auto max-w-xl px-5 py-20">
        <p className="text-sm font-semibold text-brand-red">{badge}</p>
        <h1 className="mt-3 text-3xl font-extrabold text-brand-green sm:text-4xl">{title}</h1>
        <p className="mt-4 text-base leading-relaxed text-ink/70">{description}</p>
        <p className="mt-2 text-sm font-medium text-brand-green">
          아직 준비 중인 서비스예요. 관심 등록을 남겨주시면 오픈 소식을 가장 먼저 안내드릴게요.
        </p>

        {done ? (
          <div className={`${cardClass} mt-8`}>
            <p className="font-semibold text-ink">관심 등록이 완료됐어요!</p>
            <p className="mt-1 text-sm text-muted">서비스가 오픈하면 남겨주신 연락처로 안내드릴게요.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={`${cardClass} mt-8 space-y-4`}>
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
              <textarea
                id="memo"
                rows={3}
                className={inputClass}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>

            {error && <p className={errorTextClass}>{error}</p>}

            <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
              {isSubmitting ? "등록 중..." : "관심 등록하기"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
