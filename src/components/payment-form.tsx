"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addPaymentAction } from "@/app/actions/payments";

type PaymentFormProps = {
  leaseId: string;
};

export function PaymentForm({ leaseId }: PaymentFormProps) {
  const router = useRouter();
  const [periodMonth, setPeriodMonth] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // input type=month → YYYY-MM → YYYY-MM-01
      const period =
        periodMonth.length === 7 ? `${periodMonth}-01` : periodMonth;
      const result = await addPaymentAction({
        leaseId,
        periodMonth: period,
        paidOn,
        amount,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAmount("");
      // revalidatePath 후 같은 페이지 데이터 갱신
      router.refresh();
    } catch {
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-zinc-900">납부 기록 추가</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          대상 월
          <input
            type="month"
            className={fieldClass}
            value={periodMonth}
            required
            disabled={saving}
            onChange={(e) => setPeriodMonth(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          납부일
          <input
            type="date"
            className={fieldClass}
            value={paidOn}
            required
            disabled={saving}
            onChange={(e) => setPaidOn(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          금액 (원)
          <input
            inputMode="numeric"
            className={fieldClass}
            value={amount}
            required
            disabled={saving}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
      </div>
      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {saving ? "저장 중…" : "납부 추가"}
      </button>
    </form>
  );
}
