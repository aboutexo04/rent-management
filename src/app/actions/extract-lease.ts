"use server";

import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage";
import { extractLeaseFromFile } from "@/lib/llm/extract-lease";
import {
  EMPTY_LEASE_FORM,
  type LeaseFormValues,
} from "@/types/lease";

export type ExtractLeaseActionResult =
  | { ok: true; values: LeaseFormValues }
  | { ok: false; values: LeaseFormValues; error: string };

export async function extractLeaseAction(
  storagePath: string,
  fileName: string,
): Promise<ExtractLeaseActionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      values: EMPTY_LEASE_FORM,
      error:
        "ANTHROPIC_API_KEY가 없습니다. .env.local에 키를 넣은 뒤 서버를 재시작하고, 지금은 폼에 직접 입력하세요.",
    };
  }

  const path = storagePath.trim();
  if (!path || path.includes("..") || path.startsWith("/")) {
    return {
      ok: false,
      values: EMPTY_LEASE_FORM,
      error: "잘못된 파일 경로입니다. 다시 업로드해 주세요.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      values: EMPTY_LEASE_FORM,
      error: "로그인이 필요합니다.",
    };
  }

  if (!path.startsWith(`${user.id}/`)) {
    return {
      ok: false,
      values: EMPTY_LEASE_FORM,
      error: "이 파일에 접근할 수 없습니다.",
    };
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.contracts)
    .download(path);

  if (error || !data) {
    return {
      ok: false,
      values: EMPTY_LEASE_FORM,
      error: "계약서 파일을 불러오지 못했습니다. 다시 업로드해 주세요.",
    };
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  if (bytes.byteLength === 0) {
    return {
      ok: false,
      values: EMPTY_LEASE_FORM,
      error: "다운로드한 파일이 비어 있습니다. 다시 업로드해 주세요.",
    };
  }

  // Storage Blob type이 비거나 octet-stream인 경우가 많아 파일명으로 보완
  const contentType =
    data.type && data.type !== "application/octet-stream"
      ? data.type
      : undefined;

  return extractLeaseFromFile({
    bytes,
    contentType,
    fileName: fileName || path.split("/").pop() || "contract",
    apiKey,
  });
}
