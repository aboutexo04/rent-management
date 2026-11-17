"use server";

import { createClient } from "@/lib/supabase/server";
import { canonicalizeEventTag, isEventTag } from "@/lib/events/tags";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage";

export type EventActionResult =
  | { ok: true; eventId?: string }
  | { ok: false; error: string };

async function requireLeaseOwner(leaseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "로그인이 필요합니다." };
  }

  const { data: lease } = await supabase
    .from("leases")
    .select("id")
    .eq("id", leaseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!lease) {
    return { ok: false as const, error: "계약을 찾을 수 없습니다." };
  }

  return { ok: true as const, supabase, user, leaseId: lease.id };
}

export async function createEventAction(input: {
  leaseId: string;
  occurredOn: string;
  tag: string;
  memo: string;
}): Promise<EventActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.occurredOn)) {
    return { ok: false, error: "날짜를 확인하세요." };
  }
  const tag = canonicalizeEventTag(input.tag);
  if (!isEventTag(tag)) {
    return { ok: false, error: "유형 태그가 올바르지 않습니다." };
  }

  const auth = await requireLeaseOwner(input.leaseId);
  if (!auth.ok) return auth;

  const { data, error } = await auth.supabase
    .from("events")
    .insert({
      user_id: auth.user.id,
      lease_id: auth.leaseId,
      occurred_on: input.occurredOn,
      tag,
      memo: input.memo.trim() || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message
        ? `사건 기록을 저장하지 못했습니다. (${error.message})`
        : "사건 기록을 저장하지 못했습니다.",
    };
  }

  // revalidatePath는 이 라우트에서 응답이 멈추는 경우가 있어
  // 클라이언트 router.refresh()로만 갱신합니다.
  return { ok: true, eventId: data.id };
}

export async function updateEventAction(input: {
  leaseId: string;
  eventId: string;
  occurredOn: string;
  tag: string;
  memo: string;
}): Promise<EventActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.occurredOn)) {
    return { ok: false, error: "날짜를 확인하세요." };
  }
  const tag = canonicalizeEventTag(input.tag);
  if (!isEventTag(tag)) {
    return { ok: false, error: "유형 태그가 올바르지 않습니다." };
  }

  const auth = await requireLeaseOwner(input.leaseId);
  if (!auth.ok) return auth;

  const { data, error } = await auth.supabase
    .from("events")
    .update({
      occurred_on: input.occurredOn,
      tag,
      memo: input.memo.trim() || null,
    })
    .eq("id", input.eventId)
    .eq("user_id", auth.user.id)
    .eq("lease_id", auth.leaseId)
    .select("id");

  if (error || !data?.length) {
    return {
      ok: false,
      error: error?.message
        ? `사건 기록을 수정하지 못했습니다. (${error.message})`
        : "사건 기록을 수정하지 못했습니다.",
    };
  }

  return { ok: true, eventId: data[0].id };
}

export async function deleteEventAction(input: {
  leaseId: string;
  eventId: string;
}): Promise<EventActionResult> {
  const auth = await requireLeaseOwner(input.leaseId);
  if (!auth.ok) return auth;

  const { data: attachments } = await auth.supabase
    .from("attachments")
    .select("id, storage_path")
    .eq("event_id", input.eventId)
    .eq("user_id", auth.user.id);

  if (attachments?.length) {
    const paths = attachments.map((a) => a.storage_path);
    await auth.supabase.storage
      .from(STORAGE_BUCKETS.eventAttachments)
      .remove(paths);
    await auth.supabase
      .from("attachments")
      .delete()
      .eq("event_id", input.eventId)
      .eq("user_id", auth.user.id);
  }

  const { error } = await auth.supabase
    .from("events")
    .delete()
    .eq("id", input.eventId)
    .eq("user_id", auth.user.id)
    .eq("lease_id", auth.leaseId);

  if (error) {
    return {
      ok: false,
      error: `사건 기록을 삭제하지 못했습니다. (${error.message})`,
    };
  }

  return { ok: true };
}

export async function deleteAttachmentAction(input: {
  leaseId: string;
  attachmentId: string;
}): Promise<EventActionResult> {
  const auth = await requireLeaseOwner(input.leaseId);
  if (!auth.ok) return auth;

  const { data: row } = await auth.supabase
    .from("attachments")
    .select("id, storage_path, event_id")
    .eq("id", input.attachmentId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!row) {
    return { ok: false, error: "첨부를 찾을 수 없습니다." };
  }

  await auth.supabase.storage
    .from(STORAGE_BUCKETS.eventAttachments)
    .remove([row.storage_path]);

  const { error } = await auth.supabase
    .from("attachments")
    .delete()
    .eq("id", row.id)
    .eq("user_id", auth.user.id);

  if (error) {
    return {
      ok: false,
      error: `첨부를 삭제하지 못했습니다. (${error.message})`,
    };
  }

  return { ok: true };
}
