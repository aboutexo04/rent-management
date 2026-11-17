/** 달력 날짜(YYYY-MM-DD)만 다룸. 타임존 변환 없이 KST "오늘"은 호출측에서 넘김. */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDate(iso: string): { y: number; m: number; d: number } {
  const match = DATE_RE.exec(iso);
  if (!match) {
    throw new Error(`Invalid date: ${iso}`);
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) {
    throw new Error(`Invalid calendar date: ${iso}`);
  }
  return { y, m, d };
}

export function formatDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function clampDay(y: number, m: number, day: number): number {
  return Math.min(Math.max(1, day), daysInMonth(y, m));
}

/** months를 더한 달력 날짜. day가 없으면 말일로 맞춤(월말 케이스). */
export function addMonths(iso: string, months: number): string {
  const { y, m, d } = parseDate(iso);
  const idx = y * 12 + (m - 1) + months;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  const nd = clampDay(ny, nm, d);
  return formatDate(ny, nm, nd);
}

export function addDays(iso: string, days: number): string {
  const { y, m, d } = parseDate(iso);
  const utc = Date.UTC(y, m - 1, d + days);
  const dt = new Date(utc);
  return formatDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function compareDate(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function diffCalendarDays(from: string, to: string): number {
  const a = parseDate(from);
  const b = parseDate(to);
  const ms =
    Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d);
  return Math.round(ms / 86_400_000);
}

/** 시작일 기준 만 나이식 경과 연수(정수). */
export function fullYearsBetween(start: string, today: string): number {
  const s = parseDate(start);
  const t = parseDate(today);
  let years = t.y - s.y;
  const anniversaryThisYear = formatDate(
    t.y,
    s.m,
    clampDay(t.y, s.m, s.d),
  );
  if (compareDate(today, anniversaryThisYear) < 0) {
    years -= 1;
  }
  return Math.max(0, years);
}

export function firstOfMonth(iso: string): string {
  const { y, m } = parseDate(iso);
  return formatDate(y, m, 1);
}

export function dueDateInMonth(
  year: number,
  month: number,
  paymentDay: number,
): string {
  return formatDate(year, month, clampDay(year, month, paymentDay));
}
