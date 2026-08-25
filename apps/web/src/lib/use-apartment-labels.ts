import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ApartmentComplex, ApartmentType } from "@/lib/types";

interface Item {
  complex_id: number;
  apartment_type_id: number;
}

export function useApartmentLabels(items: Item[]) {
  const [complexes, setComplexes] = useState<Record<number, ApartmentComplex>>({});
  const [types, setTypes] = useState<Record<number, ApartmentType>>({});

  const complexIds = Array.from(new Set(items.map((i) => i.complex_id))).sort().join(",");
  const typeIds = Array.from(new Set(items.map((i) => i.apartment_type_id))).sort().join(",");

  useEffect(() => {
    if (!complexIds) return;
    Promise.all(
      complexIds.split(",").map((id) => apiFetch<ApartmentComplex>(`/apartments/complexes/${id}`))
    ).then((results) => {
      setComplexes(Object.fromEntries(results.map((c) => [c.id, c])));
    });
  }, [complexIds]);

  useEffect(() => {
    if (!typeIds) return;
    Promise.all(typeIds.split(",").map((id) => apiFetch<ApartmentType>(`/apartments/types/${id}`))).then(
      (results) => {
        setTypes(Object.fromEntries(results.map((t) => [t.id, t])));
      }
    );
  }, [typeIds]);

  return { complexes, types };
}
