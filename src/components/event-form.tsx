"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createEventAction, updateEventAction } from "@/app/actions/events";
import { EVENT_TAGS, type EventTag } from "@/types";
import { lawLinkForTag } from "@/lib/events/tags";

type EventFormProps = {
  leaseId: string;
  mode: "create" | "edit";
  eventId?: string;
  initial?: {
    occurredOn: string;
    tag: EventTag;
    memo: string;
  };
  onDone?: () => void;
};

export function EventForm({
  leaseId,
  mode,
  eventId,
  initial,
  onDone,
}: EventFormProps) {
  const router = useRouter();
  const [occurredOn, setOccurredOn] = useState(initial?.occurredOn ?? "");
  const [tag, setTag] = useState<EventTag>(initial?.tag ?? "기타");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const link = lawLinkForTag(tag);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const result =
        mode === "edit" && eventId
          ? await updateEventAction({
              leaseId,
              eventId,
              occurredOn,
              tag,
              memo,
            })
          : await createEventAction({
              leaseId,
              occurredOn,
              tag,
              memo,
            });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone?.();
      router.refresh();
    } catch {
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          날짜
          <input
            type="date"
            className={fieldClass}
            value={occurredOn}
            required
            disabled={saving}
            onChange={(e) => setOccurredOn(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          유형 태그
          <select
            className={fieldClass}
            value={tag}
            disabled={saving}
            onChange={(e) => setTag(e.target.value as EventTag)}
          >
            {EVENT_TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      {link ? (
        <p className="text-xs text-zinc-500">
          {link.article ? `${link.article} · ` : null}
          {link.note}
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm text-zinc-700">
        메모
        <textarea
          rows={3}
          className={fieldClass}
          value={memo}
          disabled={saving}
          onChange={(e) => setMemo(e.target.value)}
        />
      </label>
      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {saving ? "저장 중…" : mode === "edit" ? "수정 저장" : "사건 추가"}
      </button>
    </form>
  );
}
