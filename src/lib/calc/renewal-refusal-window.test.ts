import { describe, expect, it } from "vitest";
import { computeRenewalRefusalWindow } from "./renewal-refusal-window";

describe("computeRenewalRefusalWindow", () => {
  const end = "2027-05-14";

  it("만료 6개월 전~1개월 전 구간을 계산한다", () => {
    const r = computeRenewalRefusalWindow(end, "2026-11-14");
    expect(r.windowStart).toBe("2026-11-14");
    expect(r.windowEnd).toBe("2027-04-14");
    expect(r.phase).toBe("during");
  });

  it("기간 전/중/후를 구분한다", () => {
    expect(computeRenewalRefusalWindow(end, "2026-11-13").phase).toBe("before");
    expect(computeRenewalRefusalWindow(end, "2026-11-14").phase).toBe("during");
    expect(computeRenewalRefusalWindow(end, "2027-04-14").phase).toBe("during");
    expect(computeRenewalRefusalWindow(end, "2027-04-15").phase).toBe("after");
  });

  it("월말 만료일에서도 창 경계를 맞춘다", () => {
    const r = computeRenewalRefusalWindow("2025-02-28", "2024-08-28");
    expect(r.windowStart).toBe("2024-08-28");
    expect(r.windowEnd).toBe("2025-01-28");
  });
});
