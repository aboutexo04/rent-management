import Anthropic from "@anthropic-ai/sdk";
import type { DraftKind } from "@/types";
import type { LawSearchHit } from "@/lib/law/search";

export const DRAFT_MODEL = "claude-haiku-5-5";

export const DRAFT_KIND_LABELS: Record<DraftKind, string> = {
  무단전대_소명요청: "무단전대 소명 요청",
  갱신거절_통지: "갱신거절 통지",
  연체차임_독촉: "연체 차임 지급 독촉",
};

const DRAFT_BANNER =
  "【초안입니다. 발송 전 내용을 확인하세요】\n법률 자문이 아니며, 사실관계·표현은 사용자가 검토·수정해야 합니다.\n";

type LeaseContext = {
  room: string;
  tenantName: string;
  currentStartDate: string;
  currentEndDate: string;
  deposit: number;
  monthlyRent: number;
  managementFee: number;
  paymentDay: number;
  specialTerms: string | null;
};

type EventContext = {
  occurredOn: string;
  tag: string;
  memo: string | null;
};

export type GenerateDraftResult =
  | { ok: true; body: string; citedArticles: string[] }
  | { ok: false; error: string; body: string; citedArticles: string[] };

function fallbackDraft(
  kind: DraftKind,
  lease: LeaseContext,
  events: EventContext[],
  hits: LawSearchHit[],
): GenerateDraftResult {
  const label = DRAFT_KIND_LABELS[kind];
  const cited = hits.map((h) => h.articleNo);
  const eventLines =
    events.length > 0
      ? events
          .map(
            (e) =>
              `- ${e.occurredOn} [${e.tag}] ${e.memo?.trim() || "(메모 없음)"}`,
          )
          .join("\n")
      : "- (선택된 타임라인 항목 없음)";

  const lawLines =
    hits.length > 0
      ? hits.map((h) => `- ${h.articleNo}: ${h.body.slice(0, 120)}…`).join("\n")
      : "- (검색된 조문 없음)";

  const body = `${DRAFT_BANNER}
수신: ${lease.tenantName} (호실 ${lease.room})
제목: ${label} (초안)

1. 계약 개요
- 계약 기간: ${lease.currentStartDate} ~ ${lease.currentEndDate}
- 보증금: ${lease.deposit.toLocaleString("ko-KR")}원
- 월 임대료: ${lease.monthlyRent.toLocaleString("ko-KR")}원 / 관리비: ${lease.managementFee.toLocaleString("ko-KR")}원
- 납부일: 매월 ${lease.paymentDay}일

2. 관련 기록(타임라인)
${eventLines}

3. 요청·통지 취지
(${label}에 맞는 구체적 요청 사항을 여기에 작성하세요.)

4. 참고 조문(발췌)
${lawLines}

발신: 임대인
`;

  return {
    ok: false,
    error: "LLM 초안 생성에 실패해 템플릿 초안을 반환했습니다.",
    body,
    citedArticles: cited,
  };
}

export async function generateNoticeDraft(input: {
  kind: DraftKind;
  lease: LeaseContext;
  events: EventContext[];
  lawHits: LawSearchHit[];
  apiKey: string;
}): Promise<GenerateDraftResult> {
  const citedArticles = [
    ...new Set(input.lawHits.map((h) => h.articleNo)),
  ];

  const lawBlock = input.lawHits
    .map((h) => `### ${h.articleNo}\n${h.body}`)
    .join("\n\n");

  const eventsBlock =
    input.events.length > 0
      ? input.events
          .map(
            (e) =>
              `- ${e.occurredOn} / ${e.tag} / ${e.memo?.trim() || "(메모 없음)"}`,
          )
          .join("\n")
      : "(없음)";

  const client = new Anthropic({ apiKey: input.apiKey });

  try {
    const response = await client.messages.create({
      model: DRAFT_MODEL,
      max_tokens: 2048,
      thinking: { type: "disabled" },
      system: `당신은 한국 상가 임대인이 우체국 내용증명으로 보낼 **초안**을 작성하는 도우미입니다.
법률 자문·승소 가능성을 단정하지 마세요.
"할 수 있습니다/해야 합니다" 대신 "관련 조문에 따르면 ~한 취지의 통지가 가능하다고 안내되는 경우가 있습니다"처럼 신중히 쓰세요.
반드시 한국어 본문만 출력하세요.
첫 줄은 정확히 다음으로 시작하세요:
【초안입니다. 발송 전 내용을 확인하세요】
개인정보(전화번호 등)를 새로 만들지 마세요.
제공된 계약·타임라인·조문만 근거로 쓰세요.`,
      messages: [
        {
          role: "user",
          content: `초안 종류: ${DRAFT_KIND_LABELS[input.kind]} (${input.kind})

[계약]
호실: ${input.lease.room}
임차인: ${input.lease.tenantName}
기간: ${input.lease.currentStartDate} ~ ${input.lease.currentEndDate}
보증금: ${input.lease.deposit}
월 임대료: ${input.lease.monthlyRent}
관리비: ${input.lease.managementFee}
납부일: ${input.lease.paymentDay}
특약: ${input.lease.specialTerms?.trim() || "없음"}

[선택한 타임라인]
${eventsBlock}

[검색된 조문]
${lawBlock || "(없음)"}

위 정보를 바탕으로 내용증명 초안 본문만 작성하세요.`,
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();

    if (!text) {
      return fallbackDraft(
        input.kind,
        input.lease,
        input.events,
        input.lawHits,
      );
    }

    const body = text.startsWith("【초안입니다")
      ? text
      : `${DRAFT_BANNER}\n${text}`;

    return { ok: true, body, citedArticles };
  } catch {
    return fallbackDraft(
      input.kind,
      input.lease,
      input.events,
      input.lawHits,
    );
  }
}
