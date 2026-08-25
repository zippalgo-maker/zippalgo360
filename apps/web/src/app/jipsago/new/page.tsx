"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRequireRole } from "@/lib/use-require-role";
import { cardClass, errorTextClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import ComplexTypePicker from "@/components/ComplexTypePicker";
import type { PurchaseRequest } from "@/lib/types";

export default function NewPurchaseRequestPage() {
  const router = useRouter();
  const { token } = useAuth();
  useRequireRole("customer");

  const [title, setTitle] = useState("");
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [complexId, setComplexId] = useState<number | null>(null);
  const [apartmentTypeId, setApartmentTypeId] = useState<number | null>(null);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [roomCountMin, setRoomCountMin] = useState("");
  const [description, setDescription] = useState("");
  const [contactMethod, setContactMethod] = useState("phone");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const request = await apiFetch<PurchaseRequest>("/purchase-requests", {
        method: "POST",
        token,
        body: {
          title,
          sido,
          sigungu,
          complex_id: complexId ?? undefined,
          apartment_type_id: apartmentTypeId ?? undefined,
          desired_budget_min: budgetMin ? Number(budgetMin) : undefined,
          desired_budget_max: budgetMax ? Number(budgetMax) : undefined,
          desired_move_in_date: moveInDate || undefined,
          room_count_min: roomCountMin ? Number(roomCountMin) : undefined,
          description,
          contact_method: contactMethod,
        },
      });
      router.push(`/jipsago/mine?highlight=${request.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "구매의뢰 등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-16">
      <h1 className="text-2xl font-bold text-ink">구매의뢰 등록</h1>
      <p className="mt-2 text-sm text-muted">
        원하는 조건을 등록하면 해당 지역 회원 공인중개사에게 자동으로 공유됩니다.
      </p>

      <form onSubmit={handleSubmit} className={`${cardClass} mt-6 space-y-5`}>
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="title">
            의뢰 제목
          </label>
          <input
            id="title"
            required
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="강남 84타입 매수 희망"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="sido">
              희망 시/도
            </label>
            <input
              id="sido"
              required
              className={inputClass}
              value={sido}
              onChange={(e) => setSido(e.target.value)}
              placeholder="서울특별시"
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="sigungu">
              희망 시/군/구
            </label>
            <input
              id="sigungu"
              required
              className={inputClass}
              value={sigungu}
              onChange={(e) => setSigungu(e.target.value)}
              placeholder="강남구"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>특정 단지 · 평형 (선택사항)</label>
          <ComplexTypePicker
            complexId={complexId}
            apartmentTypeId={apartmentTypeId}
            onChange={(c, t) => {
              setComplexId(c);
              setApartmentTypeId(t);
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="budgetMin">
              예산 (최소, 원)
            </label>
            <input
              id="budgetMin"
              type="number"
              className={inputClass}
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="budgetMax">
              예산 (최대, 원)
            </label>
            <input
              id="budgetMax"
              type="number"
              className={inputClass}
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="moveIn">
              희망 입주일 (선택)
            </label>
            <input
              id="moveIn"
              type="date"
              className={inputClass}
              value={moveInDate}
              onChange={(e) => setMoveInDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="roomCount">
              최소 방 개수 (선택)
            </label>
            <input
              id="roomCount"
              type="number"
              className={inputClass}
              value={roomCountMin}
              onChange={(e) => setRoomCountMin(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="contactMethod">
            선호 연락 방법
          </label>
          <select
            id="contactMethod"
            className={inputClass}
            value={contactMethod}
            onChange={(e) => setContactMethod(e.target.value)}
          >
            <option value="phone">전화</option>
            <option value="sms">문자</option>
            <option value="email">이메일</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="description">
            상세 조건
          </label>
          <textarea
            id="description"
            required
            rows={4}
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="원하시는 조건을 자유롭게 적어주세요. (수리 상태, 층수, 채광 등)"
          />
        </div>

        {error && <p className={errorTextClass}>{error}</p>}

        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
          {isSubmitting ? "등록 중..." : "구매의뢰 등록"}
        </button>
      </form>
    </div>
  );
}
