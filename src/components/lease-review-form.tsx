"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { extractLeaseAction } from "@/app/actions/extract-lease";
import { saveLeaseAction } from "@/app/actions/save-lease";
import {
  EMPTY_LEASE_FORM,
  type LeaseFormValues,
} from "@/types/lease";

type LeaseReviewFormProps = {
  storagePath: string;
  fileName: string;
};

type ExtractStatus = "idle" | "loading" | "done" | "failed";

function isNextRedirect(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "digest" in err &&
    String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

export function LeaseReviewForm({
  storagePath,
  fileName,
}: LeaseReviewFormProps) {
  const [values, setValues] = useState<LeaseFormValues>(EMPTY_LEASE_FORM);
  const [extractStatus, setExtractStatus] = useState<ExtractStatus>("idle");
  const [extractMessage, setExtractMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const userEditedRef = useRef(false);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useEffect(() => {
    let cancelled = false;
    if (retryKey > 0) {
      userEditedRef.current = false;
    }

    async function run() {
      setExtractStatus("loading");
      setExtractMessage(null);
      const result = await extractLeaseAction(storagePath, fileName);
      if (cancelled) return;

      if (!userEditedRef.current) {
        setValues(result.values);
        valuesRef.current = result.values;
      }

      if (result.ok) {
        setExtractStatus("done");
        setExtractMessage(
          userEditedRef.current
            ? "추출이 끝났습니다. 이미 수정한 내용은 유지했습니다. 저장 전 한 번 더 확인하세요."
            : "자동 추출 초안입니다. 저장 전에 반드시 확인하고 수정하세요. 추출값을 그대로 저장하지 마세요.",
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
    userEditedRef.current = true;
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      valuesRef.current = next;
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const result = await saveLeaseAction({
        values: valuesRef.current,
        storagePath,
      });
      if (result && !result.ok) {
        setError(result.error);
      }
    } catch (err) {
      if (isNextRedirect(err)) throw err;
      setError("저장 중 오류가 발생했습니다. 다시 시도하세요.");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500";
  const fieldsDisabled = extractStatus === "loading" || saving;

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
            required
            onChange={(e) => update("room", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          임차인명
          <input
            className={fieldClass}
            value={values.tenantName}
            disabled={fieldsDisabled}
            required
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
            required
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
            required
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
            required
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
            required
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
            required
            onChange={(e) => update("deposit", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          월 임대료 (원)
          <input
            inputMode="numeric"
            className={fieldClass}
            value={values.monthlyRent}
            disabled={fieldsDisabled}
            required
            onChange={(e) => update("monthlyRent", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
          월 관리비 (원)
          <input
            inputMode="numeric"
            className={fieldClass}
            value={values.managementFee}
            disabled={fieldsDisabled}
            placeholder="없으면 0"
            onChange={(e) => update("managementFee", e.target.value)}
          />
        </label>
      </div>
      <p className="text-xs text-zinc-500">
        연체·3기 차임 계산에는 (임대료+관리비)+부가세 10%를 합산합니다. 입력은
        공급가액(부가세 별도) 기준입니다.
      </p>

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

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={fieldsDisabled}
          className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {saving ? "저장 중…" : "확인 후 저장"}
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
