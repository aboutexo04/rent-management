import type { LeaseFormValues } from "@/types/lease";

export type ValidatedLeaseInput = {
  room: string;
  tenantName: string;
  firstContractDate: string;
  currentStartDate: string;
  currentEndDate: string;
  deposit: number;
  monthlyRent: number;
  managementFee: number;
  paymentDay: number;
  specialTerms: string | null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseMoneyRequired(raw: string, label: string): number | string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return `${label}을(를) 입력하세요.`;
  const n = Number(digits);
  if (!Number.isSafeInteger(n) || n < 0) {
    return `${label}이(가) 올바르지 않습니다.`;
  }
  return n;
}

/** 비어 있으면 0 */
function parseMoneyOptional(raw: string, label: string): number | string {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  if (!Number.isSafeInteger(n) || n < 0) {
    return `${label}이(가) 올바르지 않습니다.`;
  }
  return n;
}

/** 공급가액에 대한 부가세(10%). 원 미만은 버림. */
export function vatOf(supply: number): number {
  return Math.floor(supply * 0.1);
}

/**
 * F2 연체·3기 차임 기준 월 차임.
 * (월 임대료 + 월 관리비) + 부가세 10%
 */
export function monthlyCharge(rent: number, managementFee: number): number {
  const supply = rent + managementFee;
  return supply + vatOf(supply);
}

export function validateLeaseForm(
  values: LeaseFormValues,
): { ok: true; data: ValidatedLeaseInput } | { ok: false; error: string } {
  const room = values.room.trim();
  const tenantName = values.tenantName.trim();
  if (!room) return { ok: false, error: "호실을 입력하세요." };
  if (!tenantName) return { ok: false, error: "임차인명을 입력하세요." };

  for (const [label, value] of [
    ["최초 계약일", values.firstContractDate],
    ["현재 계약 시작일", values.currentStartDate],
    ["현재 계약 만료일", values.currentEndDate],
  ] as const) {
    if (!DATE_RE.test(value)) {
      return { ok: false, error: `${label}을(를) YYYY-MM-DD 형식으로 입력하세요.` };
    }
  }

  if (values.currentEndDate < values.currentStartDate) {
    return { ok: false, error: "만료일은 시작일 이후여야 합니다." };
  }

  const deposit = parseMoneyRequired(values.deposit, "보증금");
  if (typeof deposit === "string") return { ok: false, error: deposit };
  const monthlyRent = parseMoneyRequired(values.monthlyRent, "월 임대료");
  if (typeof monthlyRent === "string") return { ok: false, error: monthlyRent };
  const managementFee = parseMoneyOptional(values.managementFee, "월 관리비");
  if (typeof managementFee === "string") {
    return { ok: false, error: managementFee };
  }

  const day = Number(values.paymentDay);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return { ok: false, error: "납부일은 1~31 사이여야 합니다." };
  }

  const special = values.specialTerms.trim();

  return {
    ok: true,
    data: {
      room,
      tenantName,
      firstContractDate: values.firstContractDate,
      currentStartDate: values.currentStartDate,
      currentEndDate: values.currentEndDate,
      deposit,
      monthlyRent,
      managementFee,
      paymentDay: day,
      specialTerms: special || null,
    },
  };
}

export function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}
