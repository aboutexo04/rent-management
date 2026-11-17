import { describe, expect, it } from "vitest";
import {
  addMonths,
  clampDay,
  daysInMonth,
  dueDateInMonth,
  fullYearsBetween,
} from "./dates";

describe("dates", () => {
  it("월말·윤년: 1/31 + 1개월 → 2/28(평년) / 2/29(윤년)", () => {
    expect(addMonths("2025-01-31", 1)).toBe("2025-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
  });

  it("납부일 31일을 2월에 말일로 clamp", () => {
    expect(dueDateInMonth(2025, 2, 31)).toBe("2025-02-28");
    expect(dueDateInMonth(2024, 2, 31)).toBe("2024-02-29");
    expect(clampDay(2025, 2, 31)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
  });

  it("경과 연수(기념일 기준)", () => {
    expect(fullYearsBetween("2020-03-01", "2025-02-28")).toBe(4);
    expect(fullYearsBetween("2020-03-01", "2025-03-01")).toBe(5);
  });
});
