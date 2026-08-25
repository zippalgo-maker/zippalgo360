"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRequireRole } from "@/lib/use-require-role";
import { useApartmentLabels } from "@/lib/use-apartment-labels";
import {
  cardClass,
  errorTextClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";
import type { Listing, ListingPurchase, ListingStatus } from "@/lib/types";

const STATUS_LABEL: Record<ListingStatus, string> = {
  active: "매물 열람 진행중",
  reserved: "증빙 검토중",
  sold: "판매완료",
  cancelled: "취소됨",
};

const STATUS_COLOR: Record<ListingStatus, string> = {
  active: "bg-brand-red-soft text-brand-red",
  reserved: "bg-amber-100 text-amber-700",
  sold: "bg-brand-red text-white",
  cancelled: "bg-soft text-muted",
};

function SaleProofForm({ listing, token, onDone }: { listing: Listing; token: string; onDone: () => void }) {
  const [purchases, setPurchases] = useState<ListingPurchase[]>([]);
  const [purchaseId, setPurchaseId] = useState<number | null>(null);
  const [salePrice, setSalePrice] = useState(String(listing.asking_price));
  const [documentPath, setDocumentPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<ListingPurchase[]>(`/payments/listings/${listing.id}/purchases`, { token }).then(setPurchases);
  }, [listing.id, token]);

  async function handleSubmit() {
    if (!purchaseId || !documentPath) {
      setError("거래한 중개사와 증빙 자료를 입력해주세요.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await apiFetch("/double-benefit/sale-proofs", {
        method: "POST",
        token,
        body: {
          listing_id: listing.id,
          listing_purchase_id: purchaseId,
          document_path: documentPath,
          sale_price: Number(salePrice),
        },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "증빙 제출에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (purchases.length === 0) {
    return <p className="mt-3 text-sm text-muted">아직 이 매물을 열람한 중개사가 없어요.</p>;
  }

  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <div className="space-y-1.5">
        <label className={labelClass}>거래한 중개사</label>
        <select
          className={inputClass}
          value={purchaseId ?? ""}
          onChange={(e) => setPurchaseId(Number(e.target.value))}
        >
          <option value="">선택하세요</option>
          {purchases.map((p) => (
            <option key={p.id} value={p.id}>
              중개사무소 #{p.agent_company_id} (열람일 {new Date(p.paid_at).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className={labelClass}>최종 매도가</label>
        <input
          type="number"
          className={inputClass}
          value={salePrice}
          onChange={(e) => setSalePrice(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label className={labelClass}>증빙 자료 (계약서 파일명 등)</label>
        <input
          className={inputClass}
          value={documentPath}
          onChange={(e) => setDocumentPath(e.target.value)}
          placeholder="매매계약서_2026.pdf"
        />
      </div>
      {error && <p className={errorTextClass}>{error}</p>}
      <button type="button" onClick={handleSubmit} disabled={isSubmitting} className={primaryButtonClass}>
        {isSubmitting ? "제출 중..." : "매도증빙 제출"}
      </button>
    </div>
  );
}

export default function MyListingsPage() {
  const { token } = useAuth();
  useRequireRole("customer");

  const [listings, setListings] = useState<Listing[]>([]);
  const [openProofFor, setOpenProofFor] = useState<number | null>(null);
  const { complexes, types } = useApartmentLabels(listings);

  async function refresh() {
    if (!token) return;
    const data = await apiFetch<Listing[]>("/listings/mine", { token });
    setListings(data);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleCancel(id: number) {
    if (!token) return;
    await apiFetch(`/listings/${id}/cancel`, { method: "POST", token });
    refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">내 매물</h1>
        <Link href="/jipalgo/new" className="text-sm font-semibold text-brand-red">
          + 매물 등록
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        {listings.length === 0 && (
          <p className="text-sm text-muted">등록한 매물이 없습니다.</p>
        )}
        {listings.map((listing) => {
          const complex = complexes[listing.complex_id];
          const type = types[listing.apartment_type_id];
          return (
            <div key={listing.id} className={cardClass}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-ink">
                    {complex ? complex.name : `단지 #${listing.complex_id}`} {type && `· ${type.type_name}`}
                    {listing.dong && ` · ${listing.dong}동 ${listing.ho}호`}
                  </p>
                  <p className="mt-1 text-lg font-bold text-brand-red">
                    {listing.asking_price.toLocaleString()}원
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[listing.status]}`}>
                  {STATUS_LABEL[listing.status]}
                </span>
              </div>

              <p className="mt-2 text-sm text-muted">{listing.description}</p>

              {listing.status === "active" && (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenProofFor(openProofFor === listing.id ? null : listing.id)}
                    className={secondaryButtonClass}
                  >
                    {openProofFor === listing.id ? "증빙 입력 취소" : "매도증빙 제출"}
                  </button>
                  <button type="button" onClick={() => handleCancel(listing.id)} className={secondaryButtonClass}>
                    매물 취소
                  </button>
                </div>
              )}

              {listing.status === "sold" && (
                <Link href="/jipalgo/payouts" className="mt-3 inline-block text-sm font-semibold text-brand-red">
                  정산 내역 확인하기 →
                </Link>
              )}

              {openProofFor === listing.id && token && (
                <SaleProofForm
                  listing={listing}
                  token={token}
                  onDone={() => {
                    setOpenProofFor(null);
                    refresh();
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
