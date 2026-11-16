/** 공통 타입 — F1~F3 구현 시 확장 */

export type { Database, Tables } from "./database";

export type EventTag =
  | "무단전대 정황"
  | "차임 연체"
  | "시설 훼손"
  | "통지·발송"
  | "연락 기록"
  | "기타";

export type DraftKind =
  | "무단전대_소명요청"
  | "갱신거절_통지"
  | "연체차임_독촉";

export const EVENT_TAGS: EventTag[] = [
  "무단전대 정황",
  "차임 연체",
  "시설 훼손",
  "통지·발송",
  "연락 기록",
  "기타",
];
