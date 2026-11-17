"use server";

import { createClient } from "@/lib/supabase/server";

export type AttachmentActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function registerAttachmentAction(input: {
  leaseId: string;
  eventId: string;
  storagePath: string;
  fileName: string;
  contentType: string | null;
}): Promise<AttachmentActionResult> {
  const path = input.storagePath.trim();
  if (!path || path.includes("..") || path.startsWith("/")) {
    return { ok: false, error: "첨부 경로가 올바르지 않습니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  if (!path.startsWith(`${user.id}/`)) {
    return { ok: false, error: "이 첨부 파일에 접근할 수 없습니다." };
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, lease_id")
    .eq("id", input.eventId)
    .eq("user_id", user.id)
    .eq("lease_id", input.leaseId)
    .maybeSingle();

  if (!event) {
    return { ok: false, error: "사건 기록을 찾을 수 없습니다." };
  }

  const { error } = await supabase.from("attachments").insert({
    user_id: user.id,
    event_id: event.id,
    storage_path: path,
    file_name: input.fileName || null,
    content_type: input.contentType,
  });

  if (error) {
    return {
      ok: false,
      error: `첨부 메타데이터를 저장하지 못했습니다. (${error.message})`,
    };
  }

  return { ok: true };
}
