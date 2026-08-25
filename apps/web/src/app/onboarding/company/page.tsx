"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cardClass, errorTextClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import type { Company } from "@/lib/types";

export default function CompanyOnboardingPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();

  const [businessName, setBusinessName] = useState("");
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [regions, setRegions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "company")) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await apiFetch<Company>("/companies", {
        method: "POST",
        token,
        body: {
          company_type: "real_estate",
          business_name: businessName,
          business_registration_number: businessRegistrationNumber,
          representative_name: representativeName,
          address,
          phone,
          service_regions: regions
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean),
        },
      });
      router.push("/mypage");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "업체 등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <h1 className="text-2xl font-bold text-ink">공인중개사무소 등록</h1>
      <p className="mt-2 text-sm text-muted">
        업체 정보를 등록해야 집팔고 매물 열람과 집사고 의뢰 배정을 받을 수 있어요.
      </p>

      <form onSubmit={handleSubmit} className={`${cardClass} mt-6 space-y-4`}>
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="businessName">
            상호명
          </label>
          <input
            id="businessName"
            required
            className={inputClass}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="행복공인중개사"
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="brn">
            사업자등록번호
          </label>
          <input
            id="brn"
            required
            className={inputClass}
            value={businessRegistrationNumber}
            onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
            placeholder="123-45-67890"
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="representative">
            대표자명
          </label>
          <input
            id="representative"
            required
            className={inputClass}
            value={representativeName}
            onChange={(e) => setRepresentativeName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="address">
            사무소 주소
          </label>
          <input
            id="address"
            required
            className={inputClass}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="phone">
            사무소 연락처
          </label>
          <input
            id="phone"
            required
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="02-0000-0000"
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="regions">
            영업 지역 (쉼표로 구분)
          </label>
          <input
            id="regions"
            className={inputClass}
            value={regions}
            onChange={(e) => setRegions(e.target.value)}
            placeholder="서울특별시, 강남구"
          />
        </div>

        {error && <p className={errorTextClass}>{error}</p>}

        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
          {isSubmitting ? "등록 중..." : "업체 등록 완료"}
        </button>
      </form>
    </div>
  );
}
