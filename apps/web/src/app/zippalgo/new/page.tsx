"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRequireRole } from "@/lib/use-require-role";
import { cardClass, errorTextClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import ComplexTypePicker from "@/components/ComplexTypePicker";
import type { Listing } from "@/lib/types";

export default function NewListingPage() {
  const router = useRouter();
  const { token } = useAuth();
  useRequireRole("customer");

  const [complexId, setComplexId] = useState<number | null>(null);
  const [apartmentTypeId, setApartmentTypeId] = useState<number | null>(null);
  const [dong, setDong] = useState("");
  const [ho, setHo] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [description, setDescription] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !complexId || !apartmentTypeId) {
      setError("단지와 평형 타입을 선택해주세요.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const listing = await apiFetch<Listing>("/listings", {
        method: "POST",
        token,
        body: {
          complex_id: complexId,
          apartment_type_id: apartmentTypeId,
          dong: dong || undefined,
          ho: ho || undefined,
          asking_price: Number(askingPrice),
          description,
          move_in_date: moveInDate || undefined,
        },
      });
      router.push(`/zippalgo/mine?highlight=${listing.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "매물 등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-16">
      <h1 className="text-2xl font-bold text-ink">매물 등록</h1>
      <p className="mt-2 text-sm text-muted">
        매물을 등록하면 회원 공인중개사가 열람하고 중개를 진행합니다. 매매가 완료되면 더블베네핏
        정산을 받을 수 있어요.
      </p>

      <form onSubmit={handleSubmit} className={`${cardClass} mt-6 space-y-5`}>
        <div className="space-y-1.5">
          <label className={labelClass}>단지 · 평형</label>
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
            <label className={labelClass} htmlFor="dong">
              동 (선택)
            </label>
            <input id="dong" className={inputClass} value={dong} onChange={(e) => setDong(e.target.value)} placeholder="101" />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="ho">
              호 (선택)
            </label>
            <input id="ho" className={inputClass} value={ho} onChange={(e) => setHo(e.target.value)} placeholder="1502" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="price">
            희망 매매가 (원)
          </label>
          <input
            id="price"
            type="number"
            required
            className={inputClass}
            value={askingPrice}
            onChange={(e) => setAskingPrice(e.target.value)}
            placeholder="950000000"
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="moveIn">
            입주 가능일 (선택)
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
          <label className={labelClass} htmlFor="description">
            매물 설명
          </label>
          <textarea
            id="description"
            required
            rows={4}
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="수리 여부, 채광, 주변 환경 등을 자유롭게 적어주세요."
          />
        </div>

        {error && <p className={errorTextClass}>{error}</p>}

        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
          {isSubmitting ? "등록 중..." : "매물 등록"}
        </button>
      </form>
    </div>
  );
}
