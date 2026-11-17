/** F1 확인·수정 폼 필드 (추출값 ≠ 자동 저장) */

export type LeaseFormValues = {
  room: string;
  tenantName: string;
  firstContractDate: string;
  currentStartDate: string;
  currentEndDate: string;
  deposit: string;
  monthlyRent: string;
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
  paymentDay: "",
  specialTerms: "",
};

export const CONTRACT_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif";

export const CONTRACT_MAX_BYTES = 20 * 1024 * 1024;
