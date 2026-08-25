"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRequireRole } from "@/lib/use-require-role";
import { useApartmentLabels } from "@/lib/use-apartment-labels";
import { cardClass, errorTextClass, primaryButtonClass } from "@/lib/ui";
import type { Listing, ListingSummary } from "@/lib/types";

export default function BrowseListingsPage() {
  const { token } = useAuth();
  useRequireRole("company");

  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [unlocked, setUnlocked] = useState<Record<number, Listing>>({});
  const [error, setError] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const { complexes, types } = useApartmentLabels(listings);

  async function refresh() {
    if (!token) return;
    try {
      const data = await apiFetch<ListingSummary[]>("/listings/browse/active", { token });
      setListings(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNeedsOnboarding(true);
      } else {
        setError(err instanceof ApiError ? err.message : "매물 목록을 불러오지 못했습니다.");
      }
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handlePurchase(listingId: number) {
    if (!token) return;
    setBusyId(listingId);
    setError(null);
    try {
      const result = await apiFetch<{ listing: Listing }>(`/payments/listings/${listingId}/purchase`, {
        method: "POST",
        token,
      });
      setUnlocked((prev) => ({ ...prev, [listingId]: result.listing }));
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "결제에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-2xl font-bold text-ink">매물 둘러보기</h1>
      <p className="mt-2 text-sm text-muted">
        건당 결제로 매물 상세 정보(동/호, 연락처)를 열람할 수 있어요. 매매가 성사되고 매도증빙이
        승인되면 결제금이 매도인에게 더블베네핏으로 돌아갑니다.
      </p>

      {error && <p className={`${errorTextClass} mt-4`}>{error}</p>}

      {needsOnboarding && (
        <div className={`${cardClass} mt-6`}>
          <p className="text-sm text-ink">매물을 열람하려면 먼저 공인중개사무소 정보를 등록해주세요.</p>
          <Link href="/onboarding/company" className="mt-3 inline-block text-sm font-semibold text-brand-green">
            업체 정보 등록하러 가기 →
          </Link>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {!needsOnboarding && listings.length === 0 && (
          <p className="text-sm text-muted">현재 열람 가능한 매물이 없습니다.</p>
        )}
        {listings.map((listing) => {
          const complex = complexes[listing.complex_id];
          const type = types[listing.apartment_type_id];
          const isUnlocked = listing.is_unlocked || Boolean(unlocked[listing.id]);
          const detail = unlocked[listing.id];

          return (
            <div key={listing.id} className={cardClass}>
              <p className="font-semibold text-ink">
                {complex ? complex.name : `단지 #${listing.complex_id}`} {type && `· ${type.type_name}`}
                {isUnlocked && detail?.dong && ` · ${detail.dong}동 ${detail.ho}호`}
              </p>
              <p className="mt-1 text-lg font-bold text-brand-green">
                {listing.asking_price.toLocaleString()}원
              </p>
              <p className="mt-2 text-sm text-muted">{listing.description}</p>

              {isUnlocked ? (
                <p className="mt-3 text-sm font-semibold text-brand-green">열람 완료 · 동/호 정보 공개됨</p>
              ) : (
                <button
                  type="button"
                  disabled={busyId === listing.id}
                  onClick={() => handlePurchase(listing.id)}
                  className={`${primaryButtonClass} mt-3 w-auto px-6`}
                >
                  {busyId === listing.id
                    ? "결제 중..."
                    : `${listing.view_price.toLocaleString()}원으로 상세정보 열람`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
