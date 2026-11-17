"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerAttachmentAction } from "@/app/actions/attachments";
import {
  STORAGE_BUCKETS,
  eventAttachmentObjectPath,
} from "@/lib/supabase/storage";

const ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif";
const MAX_BYTES = 20 * 1024 * 1024;

type EventAttachmentUploadProps = {
  leaseId: string;
  eventId: string;
};

export function EventAttachmentUpload({
  leaseId,
  eventId,
}: EventAttachmentUploadProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    if (file.size > MAX_BYTES) {
      setError("파일은 20MB 이하여야 합니다.");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("로그인이 필요합니다.");
        return;
      }

      const path = eventAttachmentObjectPath(user.id, eventId, file.name);
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.eventAttachments)
        .upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const result = await registerAttachmentAction({
        leaseId,
        eventId,
        storagePath: path,
        fileName: file.name,
        contentType: file.type || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError("첨부 업로드에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-zinc-600">
        첨부 추가
        <input
          type="file"
          accept={ACCEPT}
          disabled={pending}
          onChange={onChange}
          className="mt-1 block w-full text-xs text-zinc-700 file:mr-2 file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-xs file:text-white"
        />
      </label>
      {pending ? (
        <p className="text-xs text-zinc-500">업로드 중…</p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
