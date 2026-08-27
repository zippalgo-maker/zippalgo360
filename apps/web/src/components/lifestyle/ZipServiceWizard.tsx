"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cardClass, errorTextClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import CategoryIcon from "@/components/lifestyle/CategoryIcon";
import CompanyLogo from "@/components/lifestyle/CompanyLogo";
import { getMockCompany } from "@/lib/mock-companies";
import {
  CATEGORY_LIST,
  HOME_STYLES,
  formatMemberPriceRange,
  formatPriceRange,
  getCategoryMeta,
  type ServiceCategory,
} from "@/lib/lifestyle-data";

const STEP_LABELS = ["카테고리", "상세 조건", "일정·지역", "신청 정보"];

function isValidCategory(value: string | null): value is ServiceCategory {
  return CATEGORY_LIST.some((c) => c.value === value);
}

export default function ZipServiceWizard() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isMember = !!user;

  const initialCompany = searchParams.get("company");
  const preselectedCompany = initialCompany ? getMockCompany(initialCompany) ?? null : null;
  const initialCategory = preselectedCompany ? preselectedCompany.category : searchParams.get("category");

  const [step, setStep] = useState(isValidCategory(initialCategory) ? 1 : 0);
  const [category, setCategory] = useState<ServiceCategory | null>(
    isValidCategory(initialCategory) ? initialCategory : null
  );
  const [targetCompanyId, setTargetCompanyId] = useState<string | null>(preselectedCompany?.id ?? null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [pyeong, setPyeong] = useState("");
  const [homeStyle, setHomeStyle] = useState("");
  const [region, setRegion] = useState("");
  const [desiredDate, setDesiredDate] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const meta = category ? getCategoryMeta(category) : null;
  const needsHomeContext = category === "appliance" || category === "furniture";
  const targetCompany = targetCompanyId ? getMockCompany(targetCompanyId) ?? null : null;

  function toggleOption(questionId: string, option: string, multi?: boolean) {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      if (multi) {
        const next = current.includes(option)
          ? current.filter((o) => o !== option)
          : [...current, option];
        return { ...prev, [questionId]: next };
      }
      return { ...prev, [questionId]: current.includes(option) ? [] : [option] };
    });
  }

  const canProceedStep1 = !meta || meta.quickQuestions.every((q) => (answers[q.id]?.length ?? 0) > 0);
  const canProceedStep2 = region.trim().length > 0;

  function buildMemo(): string | undefined {
    const parts = [];
    if (targetCompany) parts.push(`요청 업체: ${targetCompany.name}`);
    if (meta) {
      const lines = meta.quickQuestions
        .map((q) => {
          const selected = answers[q.id];
          return selected && selected.length > 0 ? `${q.shortLabel}: ${selected.join(", ")}` : null;
        })
        .filter((line): line is string => line !== null);
      if (lines.length) parts.push(lines.join("\n"));
    }
    if (memo.trim()) parts.push(memo.trim());
    return parts.length ? parts.join("\n\n") : undefined;
  }

  async function handleSubmit() {
    if (!category) return;
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
          memo: buildMemo(),
          pyeong: needsHomeContext && pyeong ? Number(pyeong) : undefined,
          home_style: needsHomeContext && homeStyle ? homeStyle : undefined,
        },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "신청에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetAll() {
    setDone(false);
    setStep(0);
    setCategory(null);
    setTargetCompanyId(null);
    setAnswers({});
    setPyeong("");
    setHomeStyle("");
    setRegion("");
    setDesiredDate("");
    setName("");
    setPhone("");
    setMemo("");
    setError(null);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-green-soft text-brand-green">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-7 w-7">
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4l2.3 2.3 6.3-6.3a1 1 0 0 1 1.4 0z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <h1 className="mt-5 text-2xl font-bold text-ink">신청이 완료됐어요!</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {targetCompany
            ? `${targetCompany.name}에서 남겨주신 연락처로 곧 연락드릴 예정이에요.`
            : "남겨주신 연락처로 제휴 업체가 곧 연락드릴 예정이에요."}
        </p>

        {isMember ? (
          <p className="mt-4 rounded-xl bg-brand-green-soft px-4 py-3 text-sm font-semibold text-brand-green">
            집팔고360 회원가가 자동 적용된 견적으로 안내드려요.
          </p>
        ) : (
          <p className="mt-4 rounded-xl bg-brand-red-soft px-4 py-3 text-sm text-brand-red">
            회원으로 가입하면 다음부터 더 저렴한 회원가로 이용할 수 있어요.
          </p>
        )}

        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className={`${secondaryButtonClass} w-fit px-6`}>
            홈으로
          </Link>
          <button type="button" onClick={resetAll} className={`${primaryButtonClass} w-fit px-6`}>
            다른 서비스도 신청하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-12 sm:py-16">
      <p className="text-sm font-semibold text-brand-red">집서비스 견적 신청</p>
      <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
        {meta ? meta.label : "어떤 서비스가 필요하세요?"}
      </h1>

      {targetCompany && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-brand-red bg-brand-red-soft px-4 py-3">
          <CompanyLogo name={targetCompany.name} gradient={targetCompany.gradient} className="h-10 w-10 rounded-xl text-sm" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-brand-red">이 업체에 견적요청</p>
            <p className="truncate text-sm font-bold text-ink">{targetCompany.name}</p>
          </div>
          <button
            type="button"
            onClick={() => setTargetCompanyId(null)}
            className="shrink-0 text-xs font-semibold text-brand-red underline underline-offset-2"
          >
            전체 업체에게 받기
          </button>
        </div>
      )}

      <div className="mt-6 flex items-center gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= step ? "bg-brand-red" : "bg-line"}`} />
            <p className={`mt-1.5 text-[11px] font-medium ${i === step ? "text-brand-red" : "text-muted"}`}>
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className={`${cardClass} mt-6 space-y-6`}>
        {step === 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CATEGORY_LIST.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition ${
                  category === c.value ? "border-brand-red bg-brand-red-soft" : "border-line hover:border-brand-red"
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    category === c.value ? "bg-brand-red text-white" : "bg-brand-red-soft text-brand-red"
                  }`}
                >
                  <CategoryIcon name={c.value} />
                </span>
                <span className="text-sm font-semibold text-ink">{c.label}</span>
              </button>
            ))}
          </div>
        )}

        {step === 1 && meta && (
          <>
            {meta.quickQuestions.map((q) => (
              <div key={q.id} className="space-y-2">
                <label className={labelClass}>{q.question}</label>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((option) => {
                    const selected = (answers[q.id] ?? []).includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleOption(q.id, option, q.multi)}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                          selected
                            ? "border-brand-red bg-brand-red text-white"
                            : "border-line text-ink/80 hover:border-brand-red"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

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
                  <select
                    id="homeStyle"
                    className={inputClass}
                    value={homeStyle}
                    onChange={(e) => setHomeStyle(e.target.value)}
                  >
                    <option value="">선택 안 함</option>
                    {HOME_STYLES.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="col-span-2 text-xs text-muted">
                  평형과 선호 스타일을 남겨주시면 AI가 우리 집에 맞는 {meta.label}를 추천해드려요.
                </p>
              </div>
            )}
          </>
        )}

        {step === 2 && meta && (
          <>
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="region">
                {meta.regionLabel}
              </label>
              <input
                id="region"
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
          </>
        )}

        {step === 3 && meta && (
          <>
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
              <label className={labelClass} htmlFor="memo">
                남기고 싶은 말 (선택)
              </label>
              <textarea id="memo" rows={3} className={inputClass} value={memo} onChange={(e) => setMemo(e.target.value)} />
            </div>

            <div className="rounded-xl border border-line bg-soft p-4">
              <p className="text-sm font-semibold text-ink">신청 내용 확인</p>
              <dl className="mt-2 space-y-1 text-sm text-muted">
                <div className="flex justify-between gap-3">
                  <dt>카테고리</dt>
                  <dd className="text-ink/80">{meta.label}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>요청 대상</dt>
                  <dd className="text-ink/80">{targetCompany ? targetCompany.name : "전체 제휴 업체"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>{meta.regionLabel}</dt>
                  <dd className="text-ink/80">{region || "-"}</dd>
                </div>
                {desiredDate && (
                  <div className="flex justify-between gap-3">
                    <dt>희망 일정</dt>
                    <dd className="text-ink/80">{desiredDate}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-3 border-t border-line pt-3">
                {meta.priceRange ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">
                      {isMember ? "회원가 예상 범위" : "일반가 예상 범위"}
                    </span>
                    <span className="font-bold text-brand-green">
                      {isMember
                        ? formatMemberPriceRange(meta.priceRange, meta.memberDiscountPct ?? 0)
                        : formatPriceRange(meta.priceRange)}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-brand-green">{meta.memberBenefitNote}</p>
                )}
                {!isMember && (
                  <p className="mt-1 text-xs text-brand-red">
                    회원으로 가입하면 회원가로 더 저렴하게 이용할 수 있어요.
                  </p>
                )}
              </div>
            </div>

            {error && <p className={errorTextClass}>{error}</p>}
          </>
        )}

        <div className="flex gap-3 pt-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className={`${secondaryButtonClass} flex-1`}
            >
              이전
            </button>
          ) : (
            <Link href="/zipservice" className={`${secondaryButtonClass} flex-1 text-center`}>
              취소
            </Link>
          )}

          {step < 3 ? (
            <button
              type="button"
              disabled={
                (step === 0 && !category) || (step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)
              }
              onClick={() => setStep((s) => s + 1)}
              className={`${primaryButtonClass} flex-1`}
            >
              다음
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting || !name || !phone}
              onClick={handleSubmit}
              className={`${primaryButtonClass} flex-1`}
            >
              {isSubmitting ? "신청 중..." : "신청 완료하기"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
