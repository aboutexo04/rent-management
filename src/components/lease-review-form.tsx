"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  EMPTY_LEASE_FORM,
  type LeaseFormValues,
} from "@/types/lease";

type LeaseReviewFormProps = {
  storagePath: string;
  fileName: string;
};

export function LeaseReviewForm({
  storagePath,
  fileName,
}: LeaseReviewFormProps) {
  const [values, setValues] = useState<LeaseFormValues>(EMPTY_LEASE_FORM);
  const [info, setInfo] = useState<string | null>(null);

  function update<K extends keyof LeaseFormValues>(
    key: K,
    value: LeaseFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setInfo(
      "저장·LLM 추출은 다음 단계(D3)에서 연결합니다. 지금은 업로드·폼 골격만 확인하세요.",
    );
  }

  const fieldClass =
    "rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="rounded border border-zinc-200 bg-white px-3 py-3 text-sm">
        <p className="font-medium text-zinc-900">업로드된 계약서</p>
        <p className="mt-1 text-zinc-600">{fileName}</p>
        <p className="mt-1 break-all text-xs text-zinc-400">{storagePath}</p>
      </div>

      <p className="rounded border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
        LLM 자동 추출은 아직 없습니다. 아래 필드는 확인·수정용 골격이며, 지금은
        수동으로 적어 볼 수 있습니다. 추출값을 그대로 저장하지 않습니다.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          호실
          <input
            className={fieldClass}
            value={values.room}
            onChange={(e) => update("room", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          임차인명
          <input
            className={fieldClass}
            value={values.tenantName}
            onChange={(e) => update("tenantName", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          최초 계약일
          <input
            type="date"
            className={fieldClass}
            value={values.firstContractDate}
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
            onChange={(e) => update("paymentDay", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          현재 계약 시작일
          <input
            type="date"
            className={fieldClass}
            value={values.currentStartDate}
            onChange={(e) => update("currentStartDate", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          현재 계약 만료일
          <input
            type="date"
            className={fieldClass}
            value={values.currentEndDate}
            onChange={(e) => update("currentEndDate", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          보증금 (원)
          <input
            inputMode="numeric"
            className={fieldClass}
            value={values.deposit}
            onChange={(e) => update("deposit", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          월 차임 (원)
          <input
            inputMode="numeric"
            className={fieldClass}
            value={values.monthlyRent}
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
          onChange={(e) => update("specialTerms", e.target.value)}
        />
      </label>

      {info ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {info}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          저장 시도 (D3에서 연결)
        </button>
        <Link
          href="/app/leases/new"
          className="rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          다른 파일 업로드
        </Link>
      </div>
    </form>
  );
}
