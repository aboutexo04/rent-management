import {
  addMonths,
  compareDate,
  dueDateInMonth,
  firstOfMonth,
  parseDate,
} from "./dates";
import {
  LEGAL_DISCLAIMER,
  RENEWAL_REFUSAL_ARREARS_ARTICLE,
  RENEWAL_REFUSAL_ARREARS_LABEL,
  SPECIAL_PERIOD_ARTICLE,
  SPECIAL_PERIOD_NOTE,
  TERMINATION_ARREARS_ARTICLE,
  TERMINATION_ARREARS_LABEL,
} from "./law-copy";

/** 제10조의9: 2020.9.29.부터 6개월 → 2020-09-29 ~ 2021-03-28 */
export const SPECIAL_PERIOD_START = "2020-09-29";
export const SPECIAL_PERIOD_END = "2021-03-28";

export type RentPeriod = {
  effectiveFrom: string;
  monthlyRent: number;
};

export type PaymentInput = {
  /** 대상 월 — YYYY-MM-01 */
  periodMonth: string;
  paidOn: string;
  amount: number;
};

export type ArrearsPoint = {
  date: string;
  balance: number;
  kind: "charge" | "payment" | "marker";
  /** 특례로 부과에서 제외된 차임(표시용) */
  excludedSpecial?: boolean;
  note?: string;
};

export type ArrearsResult = {
  currentArrears: number;
  currentMonthlyRent: number;
  threePeriodRent: number;
  peakArrears: number;
  peakDate: string | null;
  terminationGroundPossible: boolean;
  renewalRefusalGroundPossible: boolean;
  series: ArrearsPoint[];
  excludedSpecialChargeTotal: number;
  articles: {
    termination: string;
    renewalRefusal: string;
    specialPeriod: string;
  };
  labels: {
    termination: string;
    renewalRefusal: string;
    specialPeriod: string;
  };
  disclaimer: string;
};

function rentOnDate(periods: RentPeriod[], date: string): number {
  const sorted = [...periods].sort((a, b) =>
    compareDate(a.effectiveFrom, b.effectiveFrom),
  );
  let rent = sorted[0]?.monthlyRent ?? 0;
  for (const p of sorted) {
    if (compareDate(date, p.effectiveFrom) >= 0) {
      rent = p.monthlyRent;
    }
  }
  return rent;
}

function inSpecialPeriod(date: string): boolean {
  return (
    compareDate(date, SPECIAL_PERIOD_START) >= 0 &&
    compareDate(date, SPECIAL_PERIOD_END) <= 0
  );
}

function eachMonthFirst(from: string, to: string): string[] {
  const months: string[] = [];
  let cursor = firstOfMonth(from);
  const end = firstOfMonth(to);
  while (compareDate(cursor, end) <= 0) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return months;
}

/**
 * 금액 기준 연체 잔액 시계열.
 * - 월별 차임 부과 → 납부 차감
 * - 특례 기간 due date 부과는 잔액에 넣지 않음(excluded로만 집계)
 */
export function computeArrears(input: {
  leaseStart: string;
  today: string;
  paymentDay: number;
  rentPeriods: RentPeriod[];
  payments: PaymentInput[];
}): ArrearsResult {
  if (!input.rentPeriods.length) {
    throw new Error("rentPeriods required");
  }

  const series: ArrearsPoint[] = [];
  let balance = 0;
  let peakArrears = 0;
  let peakDate: string | null = null;
  let renewalRefusalGroundPossible = false;
  let excludedSpecialChargeTotal = 0;

  type Ev =
    | { date: string; order: number; type: "charge"; amount: number; excluded: boolean }
    | { date: string; order: number; type: "payment"; amount: number };

  const events: Ev[] = [];

  for (const monthFirst of eachMonthFirst(input.leaseStart, input.today)) {
    const { y, m } = parseDate(monthFirst);
    const due = dueDateInMonth(y, m, input.paymentDay);
    if (compareDate(due, input.leaseStart) < 0) continue;
    if (compareDate(due, input.today) > 0) continue;

    const amount = rentOnDate(input.rentPeriods, due);
    const excluded = inSpecialPeriod(due);
    events.push({
      date: due,
      order: 0,
      type: "charge",
      amount,
      excluded,
    });
  }

  for (const p of input.payments) {
    if (p.amount < 0) continue;
    events.push({
      date: p.paidOn,
      order: 1,
      type: "payment",
      amount: p.amount,
    });
  }

  events.sort((a, b) => {
    const c = compareDate(a.date, b.date);
    if (c !== 0) return c;
    return a.order - b.order;
  });

  for (const ev of events) {
    if (ev.type === "charge") {
      if (ev.excluded) {
        excludedSpecialChargeTotal += ev.amount;
        series.push({
          date: ev.date,
          balance,
          kind: "charge",
          excludedSpecial: true,
          note: "제10조의9 특례 제외",
        });
        continue;
      }
      balance += ev.amount;
      series.push({ date: ev.date, balance, kind: "charge" });
    } else {
      balance = Math.max(0, balance - ev.amount);
      series.push({ date: ev.date, balance, kind: "payment" });
    }

    if (balance > peakArrears) {
      peakArrears = balance;
      peakDate = ev.date;
    }

    const rentThen = rentOnDate(input.rentPeriods, ev.date);
    if (balance >= rentThen * 3) {
      renewalRefusalGroundPossible = true;
    }
  }

  const currentMonthlyRent = rentOnDate(input.rentPeriods, input.today);
  const threePeriodRent = currentMonthlyRent * 3;
  const terminationGroundPossible = balance >= threePeriodRent;

  return {
    currentArrears: balance,
    currentMonthlyRent,
    threePeriodRent,
    peakArrears,
    peakDate,
    terminationGroundPossible,
    renewalRefusalGroundPossible,
    series,
    excludedSpecialChargeTotal,
    articles: {
      termination: TERMINATION_ARREARS_ARTICLE,
      renewalRefusal: RENEWAL_REFUSAL_ARREARS_ARTICLE,
      specialPeriod: SPECIAL_PERIOD_ARTICLE,
    },
    labels: {
      termination: TERMINATION_ARREARS_LABEL,
      renewalRefusal: RENEWAL_REFUSAL_ARREARS_LABEL,
      specialPeriod: SPECIAL_PERIOD_NOTE,
    },
    disclaimer: LEGAL_DISCLAIMER,
  };
}
