"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRequireRole } from "@/lib/use-require-role";
import { cardClass, errorTextClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import type { ApartmentComplex, ApartmentType } from "@/lib/types";

export default function AdminApartmentsPage() {
  const { token } = useAuth();
  useRequireRole("admin");

  const [complexes, setComplexes] = useState<ApartmentComplex[]>([]);
  const [selectedComplexId, setSelectedComplexId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [complexForm, setComplexForm] = useState({
    name: "",
    sido: "",
    sigungu: "",
    eupmyeondong: "",
    road_address: "",
    completion_year: "",
    household_count: "",
    builder_name: "",
  });

  const [typeForm, setTypeForm] = useState({
    type_name: "",
    exclusive_area_m2: "",
    room_count: "",
    bathroom_count: "",
  });

  async function refreshComplexes() {
    const list = await apiFetch<ApartmentComplex[]>("/apartments/complexes?keyword=");
    setComplexes(list);
  }

  useEffect(() => {
    if (token) refreshComplexes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleCreateComplex(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    try {
      const created = await apiFetch<ApartmentComplex>("/apartments/complexes", {
        method: "POST",
        token,
        body: {
          ...complexForm,
          completion_year: complexForm.completion_year ? Number(complexForm.completion_year) : null,
          household_count: complexForm.household_count ? Number(complexForm.household_count) : null,
        },
      });
      setComplexes((prev) => [created, ...prev]);
      setSelectedComplexId(created.id);
      setComplexForm({
        name: "",
        sido: "",
        sigungu: "",
        eupmyeondong: "",
        road_address: "",
        completion_year: "",
        household_count: "",
        builder_name: "",
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "단지 등록에 실패했습니다.");
    }
  }

  async function handleCreateType(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedComplexId) return;
    setError(null);
    try {
      await apiFetch<ApartmentType>("/apartments/types", {
        method: "POST",
        token,
        body: {
          complex_id: selectedComplexId,
          type_name: typeForm.type_name,
          exclusive_area_m2: Number(typeForm.exclusive_area_m2),
          room_count: typeForm.room_count ? Number(typeForm.room_count) : null,
          bathroom_count: typeForm.bathroom_count ? Number(typeForm.bathroom_count) : null,
        },
      });
      setTypeForm({ type_name: "", exclusive_area_m2: "", room_count: "", bathroom_count: "" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "평형 타입 등록에 실패했습니다.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-2xl font-bold text-ink">단지 · 평형 마스터 데이터 관리</h1>
      <p className="mt-2 text-sm text-muted">
        매물 등록·구매의뢰에 사용되는 아파트 단지와 평형 타입을 등록합니다. (관리자 전용)
      </p>

      {error && <p className={`${errorTextClass} mt-4`}>{error}</p>}

      <form onSubmit={handleCreateComplex} className={`${cardClass} mt-6 grid gap-3 sm:grid-cols-2`}>
        <p className="sm:col-span-2 font-semibold text-ink">단지 등록</p>
        <div className="space-y-1.5">
          <label className={labelClass}>단지명</label>
          <input
            required
            className={inputClass}
            value={complexForm.name}
            onChange={(e) => setComplexForm({ ...complexForm, name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>시/도</label>
          <input
            required
            className={inputClass}
            value={complexForm.sido}
            onChange={(e) => setComplexForm({ ...complexForm, sido: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>시/군/구 (세종시 등은 비워두세요)</label>
          <input
            className={inputClass}
            value={complexForm.sigungu}
            onChange={(e) => setComplexForm({ ...complexForm, sigungu: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>읍/면/동</label>
          <input
            required
            className={inputClass}
            value={complexForm.eupmyeondong}
            onChange={(e) => setComplexForm({ ...complexForm, eupmyeondong: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className={labelClass}>도로명 주소</label>
          <input
            required
            className={inputClass}
            value={complexForm.road_address}
            onChange={(e) => setComplexForm({ ...complexForm, road_address: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>준공년도</label>
          <input
            type="number"
            className={inputClass}
            value={complexForm.completion_year}
            onChange={(e) => setComplexForm({ ...complexForm, completion_year: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>세대수</label>
          <input
            type="number"
            className={inputClass}
            value={complexForm.household_count}
            onChange={(e) => setComplexForm({ ...complexForm, household_count: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className={labelClass}>시공사</label>
          <input
            className={inputClass}
            value={complexForm.builder_name}
            onChange={(e) => setComplexForm({ ...complexForm, builder_name: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className={primaryButtonClass}>
            단지 등록
          </button>
        </div>
      </form>

      <div className={`${cardClass} mt-6`}>
        <p className="font-semibold text-ink">평형 타입 등록</p>
        <div className="mt-3 space-y-1.5">
          <label className={labelClass}>단지 선택</label>
          <select
            className={inputClass}
            value={selectedComplexId ?? ""}
            onChange={(e) => setSelectedComplexId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">단지를 선택하세요</option>
            {complexes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.sido} {c.sigungu})
              </option>
            ))}
          </select>
        </div>

        {selectedComplexId && (
          <form onSubmit={handleCreateType} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className={labelClass}>타입명</label>
              <input
                required
                className={inputClass}
                placeholder="84A"
                value={typeForm.type_name}
                onChange={(e) => setTypeForm({ ...typeForm, type_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>전용면적(㎡)</label>
              <input
                required
                type="number"
                step="0.01"
                className={inputClass}
                value={typeForm.exclusive_area_m2}
                onChange={(e) => setTypeForm({ ...typeForm, exclusive_area_m2: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>방 개수</label>
              <input
                type="number"
                className={inputClass}
                value={typeForm.room_count}
                onChange={(e) => setTypeForm({ ...typeForm, room_count: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>욕실 개수</label>
              <input
                type="number"
                className={inputClass}
                value={typeForm.bathroom_count}
                onChange={(e) => setTypeForm({ ...typeForm, bathroom_count: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className={primaryButtonClass}>
                평형 타입 등록
              </button>
            </div>
          </form>
        )}
      </div>

      <div className={`${cardClass} mt-6`}>
        <p className="font-semibold text-ink">등록된 단지 ({complexes.length})</p>
        <ul className="mt-3 space-y-2">
          {complexes.map((c) => (
            <li key={c.id} className="text-sm text-muted">
              {c.name} · {c.sido} {c.sigungu} {c.eupmyeondong}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
