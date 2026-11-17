import type { EventTag } from "@/types";
import { EVENT_TAGS } from "@/types";

/** 제10조 제1항 각 호와의 연결(기록·안내용). 법률 판단 아님. */
export type TagLawLink = {
  tag: EventTag;
  article: string | null;
  note: string;
};

export const EVENT_TAG_LAW_LINKS: TagLawLink[] = [
  {
    tag: "무단전대 정황",
    article: "상가건물임대차보호법 제10조 제1항 제4호",
    note: "동의 없는 전대 등 정황 기록",
  },
  {
    tag: "차임 연체",
    article: "상가건물임대차보호법 제10조 제1항 제1호",
    note: "차임 연체 관련 기록",
  },
  {
    tag: "시설 훼손",
    article: "상가건물임대차보호법 제10조 제1항 제5호",
    note: "고의·중과실 파손 등 정황 기록",
  },
  {
    tag: "통지·발송",
    article: null,
    note: "내용증명·통지 발송 기록 (절차 증거)",
  },
  {
    tag: "연락 기록",
    article: null,
    note: "전화·문자·면담 등 연락 증거",
  },
  {
    tag: "기타",
    article: "상가건물임대차보호법 제10조 제1항 제8호",
    note: "기타 중대한 사유 정황 (참고)",
  },
];

export function lawLinkForTag(tag: string): TagLawLink | undefined {
  const canonical = canonicalizeEventTag(tag);
  return EVENT_TAG_LAW_LINKS.find((l) => l.tag === canonical);
}

/** 한글 NFD/NFC·공백 차이로 필터 불일치가 나지 않게 정규화 */
export function normalizeTagText(value: string): string {
  return value.trim().normalize("NFC").replace(/\s+/g, " ");
}

export function canonicalizeEventTag(value: string): string {
  const normalized = normalizeTagText(value);
  const exact = EVENT_TAGS.find((t) => t === normalized);
  if (exact) return exact;
  const compact = normalized.replace(/\s+/g, "");
  return (
    EVENT_TAGS.find((t) => t.replace(/\s+/g, "") === compact) ?? normalized
  );
}

export function tagsEqual(a: string, b: string): boolean {
  return canonicalizeEventTag(a) === canonicalizeEventTag(b);
}

export function isEventTag(value: string): value is EventTag {
  const canonical = canonicalizeEventTag(value);
  return (EVENT_TAGS as string[]).includes(canonical);
}
