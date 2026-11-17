/** F1 확인·수정 폼 필드 (추출값 ≠ 자동 저장) */

export type LeaseFormValues = {
  room: string;
  tenantName: string;
  firstContractDate: string;
  currentStartDate: string;
  currentEndDate: string;
  deposit: string;
  /** 월 임대료(원) — 관리비 별도 */
  monthlyRent: string;
  /** 월 관리비(원). 연체 계산 시 임대료와 합산 */
  managementFee: string;
  paymentDay: string;
  specialTerms: string;
};

export const EMPTY_LEASE_FORM: LeaseFormValues = {
  room: "",
  tenantName: "",
  firstContractDate: "",
  currentStartDate: "",
  currentEndDate: "",
  deposit: "",
  monthlyRent: "",
  managementFee: "",
  paymentDay: "",
  specialTerms: "",
};

export const CONTRACT_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif";

export const CONTRACT_MAX_BYTES = 20 * 1024 * 1024;
