"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import { searchLawForDraft } from "@/lib/law/search";
import { generateNoticeDraft } from "@/lib/llm/draft-notice";
import { todayKst } from "@/lib/calc/today-kst";
import type { DraftKind } from "@/types";

const DRAFT_KINDS: DraftKind[] = [
  "무단전대_소명요청",
  "갱신거절_통지",
  "연체차임_독촉",
];

function isDraftKind(value: string): value is DraftKind {
  return (DRAFT_KINDS as string[]).includes(value);
}

export type DraftActionResult =
  | {
      ok: true;
      draftId?: string;
      body?: string;
      citedArticles?: string[];
    }
  | { ok: false; error: string };

export async function generateDraftAction(input: {
  leaseId: string;
  kind: string;
  eventIds: string[];
}): Promise<DraftActionResult> {
  if (!isDraftKind(input.kind)) {
    return { ok: false, error: "초안 종류가 올바르지 않습니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: lease } = await supabase
    .from("leases")
    .select(
      "id, room, tenant_name, current_start_date, current_end_date, deposit, monthly_rent, management_fee, payment_day, special_terms",
    )
    .eq("id", input.leaseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!lease) return { ok: false, error: "계약을 찾을 수 없습니다." };

  let events: {
    occurred_on: string;
    tag: string;
    memo: string | null;
  }[] = [];

  if (input.eventIds.length > 0) {
    const { data } = await supabase
      .from("events")
      .select("id, occurred_on, tag, memo")
      .eq("lease_id", lease.id)
      .eq("user_id", user.id)
      .in("id", input.eventIds);
    events = data ?? [];
  }

  const lawHits = await searchLawForDraft(
    input.kind,
    events.map((e) => `${e.tag} ${e.memo ?? ""}`).join(" "),
  );

  const { anthropicApiKey } = getServerEnv();
  if (!anthropicApiKey) {
    return {
      ok: false,
      error: "ANTHROPIC_API_KEY가 없습니다. .env.local을 확인하세요.",
    };
  }

  const generated = await generateNoticeDraft({
    kind: input.kind,
    lease: {
      room: lease.room,
      tenantName: lease.tenant_name,
      currentStartDate: lease.current_start_date,
      currentEndDate: lease.current_end_date,
      deposit: lease.deposit,
      monthlyRent: lease.monthly_rent,
      managementFee: lease.management_fee ?? 0,
      paymentDay: lease.payment_day,
      specialTerms: lease.special_terms,
    },
    events: events.map((e) => ({
      occurredOn: e.occurred_on,
      tag: e.tag,
      memo: e.memo,
    })),
    lawHits,
    apiKey: anthropicApiKey,
  });

  return {
    ok: true,
    body: generated.body,
    citedArticles: generated.citedArticles,
  };
}

export async function saveDraftAction(input: {
  leaseId: string;
  kind: string;
  body: string;
  citedArticles: string[];
}): Promise<DraftActionResult> {
  if (!isDraftKind(input.kind)) {
    return { ok: false, error: "초안 종류가 올바르지 않습니다." };
  }
  const body = input.body.trim();
  if (!body) return { ok: false, error: "초안 본문이 비어 있습니다." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: lease } = await supabase
    .from("leases")
    .select("id")
    .eq("id", input.leaseId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!lease) return { ok: false, error: "계약을 찾을 수 없습니다." };

  const { data, error } = await supabase
    .from("drafts")
    .insert({
      user_id: user.id,
      lease_id: lease.id,
      kind: input.kind,
      body,
      cited_articles: input.citedArticles,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message
        ? `초안 저장에 실패했습니다. (${error.message})`
        : "초안 저장에 실패했습니다.",
    };
  }

  return { ok: true, draftId: data.id };
}

export async function updateDraftBodyAction(input: {
  leaseId: string;
  draftId: string;
  body: string;
}): Promise<DraftActionResult> {
  const body = input.body.trim();
  if (!body) return { ok: false, error: "초안 본문이 비어 있습니다." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase
    .from("drafts")
    .update({ body })
    .eq("id", input.draftId)
    .eq("lease_id", input.leaseId)
    .eq("user_id", user.id)
    .select("id");

  if (error || !data?.length) {
    return { ok: false, error: "초안 수정에 실패했습니다." };
  }
  return { ok: true, draftId: data[0].id };
}

/** 발송일 기록 + F3에 통지·발송 사건 자동 추가 */
export async function markDraftSentAction(input: {
  leaseId: string;
  draftId: string;
  sentOn?: string;
}): Promise<DraftActionResult> {
  const sentOn = input.sentOn?.trim() || todayKst();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sentOn)) {
    return { ok: false, error: "발송일을 확인하세요." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: draft } = await supabase
    .from("drafts")
    .select("id, kind, sent_on")
    .eq("id", input.draftId)
    .eq("lease_id", input.leaseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!draft) return { ok: false, error: "초안을 찾을 수 없습니다." };
  if (draft.sent_on) {
    return { ok: false, error: "이미 발송일이 기록된 초안입니다." };
  }

  const { error: updErr } = await supabase
    .from("drafts")
    .update({ sent_on: sentOn })
    .eq("id", draft.id)
    .eq("user_id", user.id);

  if (updErr) {
    return { ok: false, error: `발송일 저장 실패. (${updErr.message})` };
  }

  const { error: evErr } = await supabase.from("events").insert({
    user_id: user.id,
    lease_id: input.leaseId,
    occurred_on: sentOn,
    tag: "통지·발송",
    memo: `내용증명 초안 발송 기록 (${draft.kind})`,
  });

  if (evErr) {
    return {
      ok: false,
      error: `발송일은 저장됐으나 타임라인 추가에 실패했습니다. (${evErr.message})`,
    };
  }

  return { ok: true, draftId: draft.id };
}
