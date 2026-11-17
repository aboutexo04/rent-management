"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { extractLeaseAction } from "@/app/actions/extract-lease";
import {
  EMPTY_LEASE_FORM,
  type LeaseFormValues,
} from "@/types/lease";

type LeaseReviewFormProps = {
  storagePath: string;
  fileName: string;
};

type ExtractStatus = "idle" | "loading" | "done" | "failed";

export function LeaseReviewForm({
  storagePath,
  fileName,
}: LeaseReviewFormProps) {
  const [values, setValues] = useState<LeaseFormValues>(EMPTY_LEASE_FORM);
  const [extractStatus, setExtractStatus] = useState<ExtractStatus>("idle");
  const [extractMessage, setExtractMessage] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setExtractStatus("loading");
      setExtractMessage(null);
      const result = await extractLeaseAction(storagePath, fileName);
      if (cancelled) return;

      setValues(result.values);
      if (result.ok) {
        setExtractStatus("done");
        setExtractMessage(
          "자동 추출 초안입니다. 저장 전에 반드시 확인하고 수정하세요. 추출값을 그대로 저장하지 마세요.",
        );
      } else {
        setExtractStatus("failed");
        setExtractMessage(result.error);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [storagePath, fileName, retryKey]);

  function update<K extends keyof LeaseFormValues>(
    key: K,
    value: LeaseFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setInfo(
      "DB 저장은 다음 단계(D3 오후)에서 연결합니다. 지금은 추출·수정만 확인하세요.",
    );
  }

  const fieldClass =
    "rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500";
  const fieldsDisabled = extractStatus === "loading";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="rounded border border-zinc-200 bg-white px-3 py-3 text-sm">
        <p className="font-medium text-zinc-900">업로드된 계약서</p>
        <p className="mt-1 text-zinc-600">{fileName}</p>
        <p className="mt-1 break-all text-xs text-zinc-400">{storagePath}</p>
      </div>

      {extractStatus === "loading" ? (
        <p className="rounded border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
          계약서에서 정보를 추출하는 중…
        </p>
      ) : null}

      {extractMessage ? (
        <p
          className={
            extractStatus === "failed"
              ? "rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              : "rounded border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900"
          }
        >
          {extractMessage}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          호실
          <input
            className={fieldClass}
            value={values.room}
            disabled={fieldsDisabled}
            onChange={(e) => update("room", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          임차인명
          <input
            className={fieldClass}
            value={values.tenantName}
            disabled={fieldsDisabled}
            onChange={(e) => update("tenantName", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          최초 계약일
          <input
            type="date"
            className={fieldClass}
            value={values.firstContractDate}
            disabled={fieldsDisabled}
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
            disabled={fieldsDisabled}
            onChange={(e) => update("paymentDay", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          현재 계약 시작일
          <input
            type="date"
            className={fieldClass}
            value={values.currentStartDate}
            disabled={fieldsDisabled}
            onChange={(e) => update("currentStartDate", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          현재 계약 만료일
          <input
            type="date"
            className={fieldClass}
            value={values.currentEndDate}
            disabled={fieldsDisabled}
            onChange={(e) => update("currentEndDate", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          보증금 (원)
          <input
            inputMode="numeric"
            className={fieldClass}
            value={values.deposit}
            disabled={fieldsDisabled}
            onChange={(e) => update("deposit", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          월 차임 (원)
          <input
            inputMode="numeric"
            className={fieldClass}
            value={values.monthlyRent}
            disabled={fieldsDisabled}
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
          disabled={fieldsDisabled}
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
          disabled={fieldsDisabled}
          className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          저장 시도 (오후 단계에서 연결)
        </button>
        <button
          type="button"
          disabled={fieldsDisabled}
          onClick={() => setRetryKey((n) => n + 1)}
          className="rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
        >
          추출 다시 시도
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
