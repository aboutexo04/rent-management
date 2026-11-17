"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { updateLeaseAction } from "@/app/actions/save-lease";
import type { LeaseFormValues } from "@/types/lease";

type LeaseEditFormProps = {
  leaseId: string;
  initialValues: LeaseFormValues;
};

export function LeaseEditForm({ leaseId, initialValues }: LeaseEditFormProps) {
  const [values, setValues] = useState<LeaseFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof LeaseFormValues>(
    key: K,
    value: LeaseFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const result = await updateLeaseAction({ leaseId, values });
      // redirect() 성공 시 여기까지 오지 않음
      if (result && !result.ok) {
        setError(result.error);
      }
    } catch (err) {
      // Next.js redirect는 특수 throw — 그대로 통과
      if (
        err &&
        typeof err === "object" &&
        "digest" in err &&
        String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
      setError("수정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          호실
          <input
            className={fieldClass}
            value={values.room}
            required
            disabled={saving}
            onChange={(e) => update("room", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          임차인명
          <input
            className={fieldClass}
            value={values.tenantName}
            required
            disabled={saving}
            onChange={(e) => update("tenantName", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          최초 계약일
          <input
            type="date"
            className={fieldClass}
            value={values.firstContractDate}
            required
            disabled={saving}
            onChange={(e) => update("firstContractDate", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          납부일 (매월)
          <input
            type="number"
            min={1}
            max={31}
            className={fieldClass}
            value={values.paymentDay}
            required
            disabled={saving}
            onChange={(e) => update("paymentDay", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          현재 계약 시작일
          <input
            type="date"
            className={fieldClass}
            value={values.currentStartDate}
            required
            disabled={saving}
            onChange={(e) => update("currentStartDate", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          현재 계약 만료일
          <input
            type="date"
            className={fieldClass}
            value={values.currentEndDate}
            required
            disabled={saving}
            onChange={(e) => update("currentEndDate", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          보증금 (원)
          <input
            inputMode="numeric"
            className={fieldClass}
            value={values.deposit}
            required
            disabled={saving}
            onChange={(e) => update("deposit", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          월 차임 (원)
          <input
            inputMode="numeric"
            className={fieldClass}
            value={values.monthlyRent}
            required
            disabled={saving}
            onChange={(e) => update("monthlyRent", e.target.value)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
        특약
        <textarea
          rows={4}
          className={fieldClass}
          value={values.specialTerms}
          disabled={saving}
          onChange={(e) => update("specialTerms", e.target.value)}
        />
      </label>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {saving ? "저장 중…" : "수정 저장"}
        </button>
        <Link
          href={`/app/leases/${leaseId}`}
          className="rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          취소
        </Link>
      </div>
    </form>
  );
}
