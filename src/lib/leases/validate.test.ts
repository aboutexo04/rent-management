import { describe, expect, it } from "vitest";
import { monthlyCharge, vatOf } from "./validate";

describe("monthlyCharge (부가세 포함)", () => {
  it("임대료+관리비에 10% 부가세를 더한다", () => {
    // 2,000,000 + 552,000 = 2,552,000 → 부가세 255,200 → 합계 2,807,200
    expect(vatOf(2_552_000)).toBe(255_200);
    expect(monthlyCharge(2_000_000, 552_000)).toBe(2_807_200);
  });

  it("관리비 0이어도 임대료에 부가세를 붙인다", () => {
    expect(monthlyCharge(1_000_000, 0)).toBe(1_100_000);
  });
});
