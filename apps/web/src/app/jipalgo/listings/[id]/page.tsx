"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cardClass, primaryButtonClass } from "@/lib/ui";
import type {
  ApartmentComplex,
  ApartmentType,
  Listing,
  ListingStatus,
  ZipteriorPortfolioListOut,
} from "@/lib/types";

const STATUS_LABEL: Record<ListingStatus, string> = {
  active: "매물 열람 진행중",
  reserved: "증빙 검토중",
  sold: "판매완료",
  cancelled: "취소됨",
};

function PortfolioSection({ complexId, apartmentTypeId }: { complexId: number; apartmentTypeId: number }) {
  const [data, setData] = useState<ZipteriorPortfolioListOut | null>(null);

  useEffect(() => {
    apiFetch<ZipteriorPortfolioListOut>(
      `/integrations/zipterior/portfolios?complex_id=${complexId}&apartment_type_id=${apartmentTypeId}`
    ).then(setData);
  }, [complexId, apartmentTypeId]);

  if (!data) return null;

  if (!data.available) {
    return (
      <p className="mt-3 text-sm text-muted">
        현재 집테리어 시공사례를 불러올 수 없어요. 잠시 후 다시 시도해주세요.
      </p>
    );
  }

  if (data.items.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted">
        아직 같은 단지·같은 평형의 시공사례가 없어요.{" "}
        <a href="https://zipterior.kr" target="_blank" rel="noreferrer" className="font-semibold text-brand-red">
          집테리어에서 더 둘러보기 →
        </a>
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.items.map((portfolio) => (
        <a
          key={portfolio.id}
          href={portfolio.detail_url}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-xl border border-line bg-white transition hover:border-brand-red"
        >
          <div className="relative aspect-[4/3] w-full bg-soft">
            {portfolio.thumbnail_url && (
              <Image src={portfolio.thumbnail_url} alt={portfolio.title} fill className="object-cover" unoptimized />
            )}
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-semibold text-ink">{portfolio.title}</p>
            <p className="mt-0.5 text-xs text-muted">{portfolio.company.name}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

export default function PublicListingDetailPage() {
  const params = useParams<{ id: string }>();
  const listingId = Number(params.id);
  const { user, token } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [complex, setComplex] = useState<ApartmentComplex | null>(null);
  const [apartmentType, setApartmentType] = useState<ApartmentType | null>(null);

  useEffect(() => {
    apiFetch<Listing>(`/listings/${listingId}`, token ? { token } : undefined).then(setListing);
  }, [listingId, token]);

  useEffect(() => {
    if (!listing) return;
    apiFetch<ApartmentComplex>(`/apartments/complexes/${listing.complex_id}`).then(setComplex);
    apiFetch<ApartmentType>(`/apartments/types/${listing.apartment_type_id}`).then(setApartmentType);
  }, [listing]);

  if (!listing) {
    return <div className="mx-auto max-w-3xl px-5 py-16 text-sm text-muted">불러오는 중...</div>;
  }

  const buyRequestParams = new URLSearchParams({
    title: `${complex?.name ?? ""} ${apartmentType?.type_name ?? ""} 매수 희망`.trim(),
    sido: complex?.sido ?? "",
    sigungu: complex?.sigungu ?? "",
    complex_id: String(listing.complex_id),
    apartment_type_id: String(listing.apartment_type_id),
  });

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <div className={cardClass}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-red">
              {complex?.sido} {complex?.sigungu} {complex?.eupmyeondong}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-ink">
              {complex?.name ?? `단지 #${listing.complex_id}`}
              {apartmentType && ` · ${apartmentType.type_name}`}
            </h1>
            {apartmentType && (
              <p className="mt-1 text-sm text-muted">
                전용 {apartmentType.exclusive_area_m2}㎡{apartmentType.pyeong_label && ` (${apartmentType.pyeong_label}평)`}
              </p>
            )}
          </div>
          <span className="rounded-full bg-brand-red-soft px-3 py-1 text-xs font-semibold text-brand-red">
            {STATUS_LABEL[listing.status]}
          </span>
        </div>

        <p className="mt-4 text-3xl font-black text-ink">{listing.asking_price.toLocaleString()}원</p>

        {listing.dong ? (
          <p className="mt-1 text-sm text-ink">{listing.dong}동 {listing.ho}호</p>
        ) : (
          <p className="mt-1 text-sm text-muted">동/호 정보는 회원 공인중개사가 열람 후 확인할 수 있어요.</p>
        )}

        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink/80">{listing.description}</p>

        {user?.role !== "company" && (
          <Link href={`/jipsago/new?${buyRequestParams.toString()}`} className={`${primaryButtonClass} mt-6`}>
            이 집 사러가기
          </Link>
        )}
      </div>

      {listing.complex_id && listing.apartment_type_id && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">같은 단지·같은 평형 인테리어 시공사례</h2>
          <p className="mt-1 text-sm text-muted">집테리어에 등록된 실제 시공사례예요.</p>
          <PortfolioSection complexId={listing.complex_id} apartmentTypeId={listing.apartment_type_id} />
        </section>
      )}
    </div>
  );
}
