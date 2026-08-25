"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cardClass, errorTextClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import type { UserRole } from "@/lib/types";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();

  const [role, setRole] = useState<UserRole>(searchParams.get("type") === "company" ? "company" : "customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register({ email, password, name, phone: phone || undefined, role });
      router.push(role === "company" ? "/onboarding/company" : "/mypage");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "회원가입에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-2xl font-bold text-ink">집팔고360 회원가입</h1>
      <p className="mt-2 text-sm text-muted">
        가입 하나로 집팔고, 집사고, 집테리어를 모두 이용할 수 있어요.
      </p>

      <div className="mt-6 flex gap-2 rounded-full bg-soft p-1">
        <button
          type="button"
          onClick={() => setRole("customer")}
          className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
            role === "customer" ? "bg-brand-red text-white" : "text-muted"
          }`}
        >
          일반회원
        </button>
        <button
          type="button"
          onClick={() => setRole("company")}
          className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
            role === "company" ? "bg-brand-red text-white" : "text-muted"
          }`}
        >
          공인중개사(업체)
        </button>
      </div>

      <form onSubmit={handleSubmit} className={`${cardClass} mt-6 space-y-4`}>
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="name">
            이름
          </label>
          <input
            id="name"
            required
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="email">
            이메일
          </label>
          <input
            id="email"
            type="email"
            required
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8자 이상"
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="phone">
            휴대폰 번호 (선택)
          </label>
          <input
            id="phone"
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
          />
        </div>

        {error && <p className={errorTextClass}>{error}</p>}

        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
          {isSubmitting ? "가입 중..." : "회원가입"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-semibold text-brand-red">
          로그인
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
