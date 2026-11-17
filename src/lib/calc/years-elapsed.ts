import { fullYearsBetween } from "./dates";
import {
  LEGAL_DISCLAIMER,
  RENEWAL_RIGHT_YEARS_ARTICLE,
  RENEWAL_RIGHT_YEARS_NOTE,
} from "./law-copy";

export const RENEWAL_RIGHT_TOTAL_YEARS = 10;

export type YearsElapsedResult = {
  yearsElapsed: number;
  yearsRemainingTowardTen: number;
  article: string;
  note: string;
  disclaimer: string;
};

export function computeYearsElapsed(
  firstContractDate: string,
  today: string,
): YearsElapsedResult {
  const yearsElapsed = fullYearsBetween(firstContractDate, today);
  return {
    yearsElapsed,
    yearsRemainingTowardTen: Math.max(
      0,
      RENEWAL_RIGHT_TOTAL_YEARS - yearsElapsed,
    ),
    article: RENEWAL_RIGHT_YEARS_ARTICLE,
    note: RENEWAL_RIGHT_YEARS_NOTE,
    disclaimer: LEGAL_DISCLAIMER,
  };
}
