"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CONTRACT_ACCEPT,
  CONTRACT_MAX_BYTES,
} from "@/types/lease";
import {
  STORAGE_BUCKETS,
  contractObjectPath,
} from "@/lib/supabase/storage";

export function LeaseUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const next = e.target.files?.[0] ?? null;
    if (!next) {
      setFile(null);
      return;
    }
    if (next.size > CONTRACT_MAX_BYTES) {
      setError("파일은 20MB 이하여야 합니다.");
      setFile(null);
      e.target.value = "";
      return;
    }
    setFile(next);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("계약서 파일(사진 또는 PDF)을 선택하세요.");
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
        setError("로그인이 필요합니다. 다시 로그인해 주세요.");
        return;
      }

      const path = contractObjectPath(user.id, file.name);
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.contracts)
        .upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const params = new URLSearchParams({
        path,
        name: file.name,
      });
      router.push(`/app/leases/new/review?${params.toString()}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
        계약서 파일
        <input
          type="file"
          accept={CONTRACT_ACCEPT}
          onChange={onFileChange}
          className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:text-white"
        />
      </label>
      <p className="text-xs text-zinc-500">
        PDF 또는 이미지(JPG/PNG/WebP/HEIC), 최대 20MB
      </p>

      {file ? (
        <p className="text-sm text-zinc-600">
          선택: <span className="font-medium text-zinc-900">{file.name}</span>
        </p>
      ) : null}

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !file}
        className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "업로드 중…" : "업로드하고 확인으로"}
      </button>
    </form>
  );
}
