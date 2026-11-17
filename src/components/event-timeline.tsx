"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EventForm } from "@/components/event-form";
import { EventAttachmentUpload } from "@/components/event-attachment-upload";
import {
  deleteAttachmentAction,
  deleteEventAction,
} from "@/app/actions/events";
import { EVENT_TAGS, type EventTag } from "@/types";
import { lawLinkForTag } from "@/lib/events/tags";

export type TimelineAttachment = {
  id: string;
  file_name: string | null;
  storage_path: string;
  content_type: string | null;
};

export type TimelineEvent = {
  id: string;
  occurred_on: string;
  tag: string;
  memo: string | null;
  attachments: TimelineAttachment[];
};

type EventTimelineProps = {
  leaseId: string;
  events: TimelineEvent[];
};

export function EventTimeline({ leaseId, events }: EventTimelineProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<EventTag | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list =
      filter === "all" ? events : events.filter((e) => e.tag === filter);
    return [...list].sort((a, b) =>
      a.occurred_on < b.occurred_on ? 1 : a.occurred_on > b.occurred_on ? -1 : 0,
    );
  }, [events, filter]);

  async function onDeleteEvent(eventId: string) {
    if (!confirm("이 사건 기록과 첨부를 삭제할까요?")) return;
    setError(null);
    setBusyId(eventId);
    try {
      const result = await deleteEventAction({ leaseId, eventId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function onDeleteAttachment(attachmentId: string) {
    if (!confirm("이 첨부를 삭제할까요?")) return;
    setError(null);
    setBusyId(attachmentId);
    try {
      const result = await deleteAttachmentAction({ leaseId, attachmentId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">
            사건 타임라인 (F3)
          </h2>
          <p className="text-xs text-amber-800">
            법률 자문이 아닙니다. 태그·조문 연결은 기록·참고용입니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreate((v) => !v);
            setEditingId(null);
          }}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          {showCreate ? "작성 닫기" : "사건 추가"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="전체"
        />
        {EVENT_TAGS.map((tag) => (
          <FilterChip
            key={tag}
            active={filter === tag}
            onClick={() => setFilter(tag)}
            label={tag}
          />
        ))}
      </div>

      {showCreate ? (
        <div className="rounded border border-zinc-100 bg-zinc-50 p-3">
          <EventForm
            leaseId={leaseId}
            mode="create"
            onDone={() => setShowCreate(false)}
          />
        </div>
      ) : null}

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">표시할 사건 기록이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((event) => {
            const link = lawLinkForTag(event.tag);
            const editing = editingId === event.id;
            return (
              <li
                key={event.id}
                className="rounded border border-zinc-100 bg-zinc-50 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium text-zinc-900">
                      {event.occurred_on} · {event.tag}
                    </p>
                    {link ? (
                      <p className="text-xs text-zinc-500">
                        {link.article ?? "조문 직접 연결 없음"} · {link.note}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      className="underline text-zinc-600"
                      disabled={busyId === event.id}
                      onClick={() => {
                        setEditingId(editing ? null : event.id);
                        setShowCreate(false);
                      }}
                    >
                      {editing ? "취소" : "수정"}
                    </button>
                    <button
                      type="button"
                      className="underline text-red-700"
                      disabled={busyId === event.id}
                      onClick={() => void onDeleteEvent(event.id)}
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {editing ? (
                  <div className="mt-3">
                    <EventForm
                      leaseId={leaseId}
                      mode="edit"
                      eventId={event.id}
                      initial={{
                        occurredOn: event.occurred_on,
                        tag: event.tag as EventTag,
                        memo: event.memo ?? "",
                      }}
                      onDone={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                    {event.memo?.trim() ? event.memo : "메모 없음"}
                  </p>
                )}

                <div className="mt-3 flex flex-col gap-2">
                  {event.attachments.length > 0 ? (
                    <ul className="text-xs text-zinc-600">
                      {event.attachments.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between gap-2 py-0.5"
                        >
                          <span className="truncate">
                            {a.file_name ?? a.storage_path}
                          </span>
                          <button
                            type="button"
                            className="shrink-0 underline text-red-700"
                            disabled={busyId === a.id}
                            onClick={() => void onDeleteAttachment(a.id)}
                          >
                            삭제
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-zinc-400">첨부 없음</p>
                  )}
                  <EventAttachmentUpload
                    leaseId={leaseId}
                    eventId={event.id}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded bg-zinc-900 px-2.5 py-1 text-xs text-white"
          : "rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-700"
      }
    >
      {label}
    </button>
  );
}
