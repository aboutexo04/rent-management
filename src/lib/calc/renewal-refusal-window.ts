import { addMonths, compareDate, diffCalendarDays } from "./dates";
import {
  LEGAL_DISCLAIMER,
  RENEWAL_REFUSAL_WINDOW_ARTICLE,
  RENEWAL_REFUSAL_WINDOW_NOTE,
} from "./law-copy";

export type WindowPhase = "before" | "during" | "after";

export type RenewalRefusalWindowResult = {
  windowStart: string;
  windowEnd: string;
  phase: WindowPhase;
  /** during: 기간 종료까지 남은 일수(오늘 포함 아님, end-today). before: 시작까지. after: 0 */
  daysRemainingInWindow: number;
  daysUntilWindowStarts: number;
  article: string;
  note: string;
  disclaimer: string;
};

/**
 * 갱신거절 통지 가능 기간: 만료일 기준 6개월 전 ~ 1개월 전 (양 끝 포함).
 */
export function computeRenewalRefusalWindow(
  currentEndDate: string,
  today: string,
): RenewalRefusalWindowResult {
  const windowStart = addMonths(currentEndDate, -6);
  const windowEnd = addMonths(currentEndDate, -1);

  let phase: WindowPhase;
  if (compareDate(today, windowStart) < 0) {
    phase = "before";
  } else if (compareDate(today, windowEnd) > 0) {
    phase = "after";
  } else {
    phase = "during";
  }

  const daysUntilWindowStarts =
    phase === "before" ? diffCalendarDays(today, windowStart) : 0;
  const daysRemainingInWindow =
    phase === "during" ? Math.max(0, diffCalendarDays(today, windowEnd)) : 0;

  return {
    windowStart,
    windowEnd,
    phase,
    daysRemainingInWindow,
    daysUntilWindowStarts,
    article: RENEWAL_REFUSAL_WINDOW_ARTICLE,
    note: RENEWAL_REFUSAL_WINDOW_NOTE,
    disclaimer: LEGAL_DISCLAIMER,
  };
}
