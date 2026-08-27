"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRequireRole } from "@/lib/use-require-role";
import { errorTextClass } from "@/lib/ui";
import type { User, UserRole } from "@/lib/types";

const ROLE_LABEL: Record<UserRole, string> = {
  customer: "일반회원",
  company: "업체",
  admin: "관리자",
};

export default function AdminMembersPage() {
  const { token, user: me } = useAuth();
  useRequireRole("admin");

  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function refresh() {
    if (!token) return;
    const query = roleFilter ? `?role=${roleFilter}` : "";
    const list = await apiFetch<User[]>(`/users${query}`, { token });
    setUsers(list);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, roleFilter]);

  async function handleToggleActive(u: User) {
    if (!token) return;
    setBusyId(u.id);
    setError(null);
    try {
      await apiFetch(`/users/${u.id}/${u.is_active ? "deactivate" : "activate"}`, {
        method: "POST",
        token,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRoleChange(u: User, role: UserRole) {
    if (!token || role === u.role) return;
    setBusyId(u.id);
    setError(null);
    try {
      await apiFetch(`/users/${u.id}/role`, { method: "POST", token, body: { role } });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <h1 className="text-2xl font-bold text-ink">회원 관리</h1>
      <p className="mt-2 text-sm text-muted">집팔고360 통합회원의 역할과 활성 상태를 관리합니다.</p>

      <div className="mt-6 flex gap-2">
        {(["", "customer", "company", "admin"] as const).map((r) => (
          <button
            key={r || "all"}
            type="button"
            onClick={() => setRoleFilter(r)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              roleFilter === r
                ? "border-brand-red bg-brand-red-soft text-brand-red"
                : "border-line text-muted hover:border-brand-red hover:text-brand-red"
            }`}
          >
            {r ? ROLE_LABEL[r] : "전체"}
          </button>
        ))}
      </div>

      {error && <p className={`${errorTextClass} mt-4`}>{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-soft text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">이메일</th>
              <th className="px-4 py-3 font-medium">역할</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">가입일</th>
              <th className="px-4 py-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 text-ink">{u.name}</td>
                <td className="px-4 py-3 text-muted">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    disabled={busyId === u.id || u.id === me?.id}
                    onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                    className="rounded-lg border border-line bg-white px-2 py-1 text-sm disabled:opacity-50"
                  >
                    {(Object.keys(ROLE_LABEL) as UserRole[]).map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      u.is_active ? "bg-brand-green-soft text-brand-green" : "bg-brand-red-soft text-brand-red"
                    }`}
                  >
                    {u.is_active ? "활성" : "비활성"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{new Date(u.created_at).toLocaleDateString("ko-KR")}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={busyId === u.id || u.id === me?.id}
                    onClick={() => handleToggleActive(u)}
                    className="text-sm font-semibold text-brand-red hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {u.is_active ? "비활성화" : "활성화"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="px-4 py-6 text-sm text-muted">회원이 없습니다.</p>}
      </div>
    </div>
  );
}
