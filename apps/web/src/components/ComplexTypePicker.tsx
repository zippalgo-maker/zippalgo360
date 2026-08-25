"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { inputClass, labelClass } from "@/lib/ui";
import type { ApartmentComplex, ApartmentType } from "@/lib/types";

interface Props {
  complexId: number | null;
  apartmentTypeId: number | null;
  onChange: (complexId: number | null, apartmentTypeId: number | null) => void;
}

export default function ComplexTypePicker({ complexId, apartmentTypeId, onChange }: Props) {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<ApartmentComplex[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedComplex, setSelectedComplex] = useState<ApartmentComplex | null>(null);
  const [types, setTypes] = useState<ApartmentType[]>([]);

  useEffect(() => {
    if (!complexId || selectedComplex) return;
    apiFetch<ApartmentComplex>(`/apartments/complexes/${complexId}`).then(setSelectedComplex);
    apiFetch<ApartmentType[]>(`/apartments/complexes/${complexId}/types`).then(setTypes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complexId]);

  async function handleSearch() {
    if (!keyword.trim()) return;
    setIsSearching(true);
    try {
      const complexes = await apiFetch<ApartmentComplex[]>(
        `/apartments/complexes?keyword=${encodeURIComponent(keyword)}`
      );
      setResults(complexes);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSelectComplex(complex: ApartmentComplex) {
    setSelectedComplex(complex);
    setResults([]);
    const complexTypes = await apiFetch<ApartmentType[]>(`/apartments/complexes/${complex.id}/types`);
    setTypes(complexTypes);
    onChange(complex.id, null);
  }

  function handleReset() {
    setSelectedComplex(null);
    setTypes([]);
    setKeyword("");
    onChange(null, null);
  }

  if (complexId && apartmentTypeId && selectedComplex) {
    const type = types.find((t) => t.id === apartmentTypeId);
    return (
      <div className="rounded-xl border border-brand-red-soft bg-brand-red-soft/40 p-4">
        <p className="text-sm font-semibold text-ink">
          {selectedComplex.name} · {type?.type_name}
        </p>
        <p className="mt-1 text-xs text-muted">
          {selectedComplex.sido} {selectedComplex.sigungu} {selectedComplex.eupmyeondong}
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="mt-2 text-xs font-semibold text-brand-red underline"
        >
          다시 선택하기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>단지 검색</label>
        <div className="mt-1.5 flex gap-2">
          <input
            className={inputClass}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="단지명을 입력하세요 (예: 래미안강남)"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="shrink-0 rounded-xl bg-brand-red px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            검색
          </button>
        </div>
      </div>

      {results.length > 0 && !selectedComplex && (
        <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
          {results.map((complex) => (
            <li key={complex.id}>
              <button
                type="button"
                onClick={() => handleSelectComplex(complex)}
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-red-soft"
              >
                <span className="font-medium text-ink">{complex.name}</span>
                <span className="ml-2 text-xs text-muted">
                  {complex.sido} {complex.sigungu} {complex.eupmyeondong}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedComplex && types.length === 0 && (
        <p className="text-sm text-muted">등록된 평형 타입이 없는 단지입니다.</p>
      )}

      {selectedComplex && types.length > 0 && (
        <div>
          <label className={labelClass}>평형 타입 선택</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {types.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => onChange(selectedComplex.id, type.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  apartmentTypeId === type.id
                    ? "border-brand-red bg-brand-red text-white"
                    : "border-line text-ink hover:border-brand-red"
                }`}
              >
                {type.type_name} ({type.exclusive_area_m2}㎡{type.pyeong_label ? ` · ${type.pyeong_label}평` : ""})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
