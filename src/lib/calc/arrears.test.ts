import { describe, expect, it } from "vitest";
import { computeArrears } from "./arrears";

describe("computeArrears (금액 기준)", () => {
  it("부분 납부 후 잔액을 금액으로 계산한다", () => {
    const r = computeArrears({
      leaseStart: "2024-01-01",
      today: "2024-03-31",
      paymentDay: 10,
      rentPeriods: [{ effectiveFrom: "2024-01-01", monthlyRent: 1_000_000 }],
      payments: [
        { periodMonth: "2024-01-01", paidOn: "2024-01-10", amount: 1_000_000 },
        { periodMonth: "2024-02-01", paidOn: "2024-02-10", amount: 400_000 },
      ],
    });
    // 1월 완납, 2·3월 부과 2,000,000 − 400,000 = 1,600,000
    expect(r.currentArrears).toBe(1_600_000);
    expect(r.threePeriodRent).toBe(3_000_000);
    expect(r.terminationGroundPossible).toBe(false);
  });

  it("현재 연체액 ≥ 3기 차임이면 해지 사유 해당 가능", () => {
    const r = computeArrears({
      leaseStart: "2024-01-01",
      today: "2024-04-10",
      paymentDay: 10,
      rentPeriods: [{ effectiveFrom: "2024-01-01", monthlyRent: 1_000_000 }],
      payments: [],
    });
    // 1~4월 네 번 부과 → 4,000,000 ≥ 3,000,000
    expect(r.currentArrears).toBe(4_000_000);
    expect(r.terminationGroundPossible).toBe(true);
    expect(r.renewalRefusalGroundPossible).toBe(true);
  });

  it("한번 3기 도달 후 완납해도 갱신거절 사유 기록은 유지", () => {
    const r = computeArrears({
      leaseStart: "2024-01-01",
      today: "2024-06-30",
      paymentDay: 10,
      rentPeriods: [{ effectiveFrom: "2024-01-01", monthlyRent: 1_000_000 }],
      payments: [
        {
          periodMonth: "2024-01-01",
          paidOn: "2024-04-15",
          amount: 4_000_000,
        },
      ],
    });
    expect(r.peakArrears).toBeGreaterThanOrEqual(3_000_000);
    expect(r.renewalRefusalGroundPossible).toBe(true);
    expect(r.currentArrears).toBeLessThan(3_000_000);
  });

  it("차임 변경 구간을 반영한다", () => {
    const r = computeArrears({
      leaseStart: "2024-01-01",
      today: "2024-02-28",
      paymentDay: 10,
      rentPeriods: [
        { effectiveFrom: "2024-01-01", monthlyRent: 1_000_000 },
        { effectiveFrom: "2024-02-01", monthlyRent: 1_200_000 },
      ],
      payments: [],
    });
    expect(r.currentArrears).toBe(2_200_000);
    expect(r.currentMonthlyRent).toBe(1_200_000);
    expect(r.threePeriodRent).toBe(3_600_000);
  });

  it("제10조의9 특례 기간 부과분은 잔액에서 제외한다", () => {
    const r = computeArrears({
      leaseStart: "2020-09-01",
      today: "2020-11-30",
      paymentDay: 10,
      rentPeriods: [{ effectiveFrom: "2020-09-01", monthlyRent: 1_000_000 }],
      payments: [],
    });
    // 9/10 due는 특례 전, 10/10·11/10은 특례 중 → 잔액 1,000,000만
    expect(r.currentArrears).toBe(1_000_000);
    expect(r.excludedSpecialChargeTotal).toBe(2_000_000);
  });

  it("월말 납부일·윤년 2월을 처리한다", () => {
    const r = computeArrears({
      leaseStart: "2024-02-01",
      today: "2024-02-29",
      paymentDay: 31,
      rentPeriods: [{ effectiveFrom: "2024-02-01", monthlyRent: 500_000 }],
      payments: [],
    });
    expect(r.series.some((p) => p.date === "2024-02-29")).toBe(true);
    expect(r.currentArrears).toBe(500_000);
  });
});
