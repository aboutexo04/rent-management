import { formatWon, monthlyCharge } from "@/lib/leases/validate";
import {
  computeArrears,
  computeRenewalRefusalWindow,
  computeYearsElapsed,
  todayKst,
} from "@/lib/calc";
import { PaymentForm } from "@/components/payment-form";

type F2DashboardProps = {
  lease: {
    id: string;
    first_contract_date: string;
    current_start_date: string;
    current_end_date: string;
    monthly_rent: number;
    management_fee?: number | null;
    payment_day: number;
  };
  payments: {
    period_month: string;
    paid_on: string;
    amount: number;
  }[];
};

function phaseLabel(phase: "before" | "during" | "after"): string {
  if (phase === "before") return "기간 전";
  if (phase === "during") return "기간 중";
  return "기간 후";
}

export function F2Dashboard({ lease, payments }: F2DashboardProps) {
  const today = todayKst();
  const window = computeRenewalRefusalWindow(lease.current_end_date, today);
  const years = computeYearsElapsed(lease.first_contract_date, today);
  const periodCharge = monthlyCharge(
    lease.monthly_rent,
    lease.management_fee ?? 0,
  );
  const arrears = computeArrears({
    leaseStart: lease.current_start_date,
    today,
    paymentDay: lease.payment_day,
    rentPeriods: [
      {
        effectiveFrom: lease.current_start_date,
        monthlyRent: periodCharge,
      },
    ],
    payments: payments.map((p) => ({
      periodMonth: p.period_month,
      paidOn: p.paid_on,
      amount: p.amount,
    })),
  });

  const maxBalance = Math.max(1, ...arrears.series.map((s) => s.balance), arrears.peakArrears);

  return (
    <section className="flex flex-col gap-6 rounded border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-zinc-900">
          기한·연체 (F2)
        </h2>
        <p className="text-xs text-amber-800">{window.disclaimer}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-medium text-zinc-900">갱신거절 통지 가능 기간</p>
          <p className="text-zinc-700">
            {window.windowStart} ~ {window.windowEnd}
          </p>
          <p className="text-zinc-700">
            오늘({today}): <strong>{phaseLabel(window.phase)}</strong>
            {window.phase === "before"
              ? ` · 시작까지 ${window.daysUntilWindowStarts}일`
              : null}
            {window.phase === "during"
              ? ` · 종료까지 ${window.daysRemainingInWindow}일`
              : null}
          </p>
          <p className="text-xs text-zinc-500">{window.article}</p>
          <p className="text-xs text-zinc-500">{window.note}</p>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <p className="font-medium text-zinc-900">최초 계약 경과 연수</p>
          <p className="text-zinc-700">
            {years.yearsElapsed}년 경과 · 10년까지{" "}
            {years.yearsRemainingTowardTen}년
          </p>
          <p className="text-xs text-zinc-500">{years.article}</p>
          <p className="text-xs text-zinc-500">{years.note}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <p className="font-medium text-zinc-900">차임 연체 (금액 기준)</p>
        <p className="text-xs text-zinc-500">
          월 차임(합산) {formatWon(periodCharge)} = (임대료 + 관리비) + 부가세
          10%
        </p>
        <p className="text-zinc-700">
          현재 연체액 <strong>{formatWon(arrears.currentArrears)}</strong> · 3기
          차임 {formatWon(arrears.threePeriodRent)}
        </p>
        <p className="text-zinc-700">
          최고 연체액 {formatWon(arrears.peakArrears)}
          {arrears.peakDate ? ` (${arrears.peakDate})` : ""}
        </p>
        {arrears.terminationGroundPossible ? (
          <p className="text-sm text-red-800">
            {arrears.labels.termination} · {arrears.articles.termination}
          </p>
        ) : null}
        {arrears.renewalRefusalGroundPossible ? (
          <p className="text-sm text-red-800">
            {arrears.labels.renewalRefusal} · {arrears.articles.renewalRefusal}
          </p>
        ) : null}
        {arrears.excludedSpecialChargeTotal > 0 ? (
          <p className="text-xs text-zinc-500">
            특례 제외 부과 합계{" "}
            {formatWon(arrears.excludedSpecialChargeTotal)} ·{" "}
            {arrears.labels.specialPeriod}
          </p>
        ) : null}

        <div className="mt-2 flex h-24 items-end gap-0.5 rounded border border-zinc-100 bg-zinc-50 px-2 py-2">
          {arrears.series.length === 0 ? (
            <p className="text-xs text-zinc-400">추이 데이터 없음</p>
          ) : (
            arrears.series.map((point, idx) => (
              <div
                key={`${point.date}-${point.kind}-${idx}`}
                title={`${point.date}: ${formatWon(point.balance)}`}
                className={`w-full max-w-[10px] rounded-t ${
                  point.excludedSpecial ? "bg-zinc-300" : "bg-zinc-800"
                }`}
                style={{
                  height: `${Math.max(4, (point.balance / maxBalance) * 100)}%`,
                }}
              />
            ))
          )}
        </div>
      </div>

      <PaymentForm leaseId={lease.id} />

      {payments.length > 0 ? (
        <ul className="divide-y divide-zinc-100 text-sm">
          {payments.map((p, i) => (
            <li
              key={`${p.period_month}-${p.paid_on}-${i}`}
              className="flex justify-between gap-3 py-2 text-zinc-700"
            >
              <span>
                대상 {p.period_month.slice(0, 7)} · 납부 {p.paid_on}
              </span>
              <span>{formatWon(p.amount)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">아직 납부 기록이 없습니다.</p>
      )}
    </section>
  );
}
