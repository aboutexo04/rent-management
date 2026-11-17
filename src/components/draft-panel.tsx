"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  generateDraftAction,
  markDraftSentAction,
  saveDraftAction,
  updateDraftBodyAction,
} from "@/app/actions/drafts";
import { DRAFT_KIND_LABELS } from "@/lib/llm/draft-notice";
import { DRAFT_KINDS, type DraftKind } from "@/types";

export type DraftListItem = {
  id: string;
  kind: string;
  body: string;
  cited_articles: string[];
  created_at: string;
  sent_on: string | null;
};

export type DraftEventOption = {
  id: string;
  occurred_on: string;
  tag: string;
  memo: string | null;
};

type DraftPanelProps = {
  leaseId: string;
  events: DraftEventOption[];
  drafts: DraftListItem[];
};

export function DraftPanel({ leaseId, events, drafts }: DraftPanelProps) {
  const router = useRouter();
  const [kind, setKind] = useState<DraftKind>("무단전대_소명요청");
  const [selected, setSelected] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [cited, setCited] = useState<string[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleEvent(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onGenerate() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const result = await generateDraftAction({
        leaseId,
        kind,
        eventIds: selected,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody(result.body ?? "");
      setCited(result.citedArticles ?? []);
      setActiveDraftId(null);
      setInfo("초안이 생성되었습니다. 내용을 확인·수정한 뒤 저장하세요.");
    } catch {
      setError("초안 생성 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (activeDraftId) {
        const result = await updateDraftBodyAction({
          leaseId,
          draftId: activeDraftId,
          body,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setInfo("초안이 수정 저장되었습니다.");
      } else {
        const result = await saveDraftAction({
          leaseId,
          kind,
          body,
          citedArticles: cited,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setActiveDraftId(result.draftId ?? null);
        setInfo("초안이 저장되었습니다.");
      }
      router.refresh();
    } catch {
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function onMarkSent(draftId: string) {
    if (!confirm("발송일을 오늘로 기록하고 타임라인에 ‘통지·발송’을 추가할까요?")) {
      return;
    }
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const result = await markDraftSentAction({ leaseId, draftId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInfo("발송일을 기록했고 타임라인에 추가했습니다.");
      router.refresh();
    } catch {
      setError("발송 기록 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function loadDraft(d: DraftListItem) {
    setActiveDraftId(d.id);
    setKind(
      (DRAFT_KINDS as string[]).includes(d.kind)
        ? (d.kind as DraftKind)
        : "무단전대_소명요청",
    );
    setBody(d.body);
    setCited(d.cited_articles ?? []);
    setInfo("저장된 초안을 불러왔습니다.");
    setError(null);
  }

  const fieldClass =
    "rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500";

  return (
    <section className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">
          내용증명 초안 (F4)
        </h2>
        <p className="text-xs text-amber-800">
          초안입니다. 발송 전 내용을 확인하세요. 법률 자문이 아닙니다.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm text-zinc-700">
        초안 종류
        <select
          className={fieldClass}
          value={kind}
          disabled={busy}
          onChange={(e) => setKind(e.target.value as DraftKind)}
        >
          {DRAFT_KINDS.map((k) => (
            <option key={k} value={k}>
              {DRAFT_KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-zinc-800">
          근거로 쓸 타임라인 항목
        </p>
        {events.length === 0 ? (
          <p className="text-xs text-zinc-500">등록된 사건이 없습니다.</p>
        ) : (
          <ul className="max-h-40 overflow-y-auto rounded border border-zinc-100 bg-zinc-50 p-2 text-sm">
            {events.map((e) => (
              <li key={e.id} className="py-1">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.includes(e.id)}
                    disabled={busy}
                    onChange={() => toggleEvent(e.id)}
                  />
                  <span>
                    {e.occurred_on} · {e.tag}
                    {e.memo?.trim() ? ` — ${e.memo}` : ""}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onGenerate()}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {busy ? "처리 중…" : "초안 생성"}
        </button>
        <button
          type="button"
          disabled={busy || !body.trim()}
          onClick={() => void onSave()}
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
        >
          {activeDraftId ? "수정 저장" : "초안 저장"}
        </button>
      </div>

      {cited.length > 0 ? (
        <p className="text-xs text-zinc-600">
          인용 조문: {cited.join(", ")}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm text-zinc-700">
        초안 본문
        <textarea
          rows={14}
          className={`${fieldClass} font-mono text-xs leading-relaxed`}
          value={body}
          disabled={busy}
          onChange={(e) => setBody(e.target.value)}
          placeholder="초안 생성을 누르면 여기에 본문이 채워집니다."
        />
      </label>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {info}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-zinc-800">저장된 초안</p>
        {drafts.length === 0 ? (
          <p className="text-xs text-zinc-500">아직 저장된 초안이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {drafts.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-zinc-900">
                    {DRAFT_KIND_LABELS[d.kind as DraftKind] ?? d.kind}
                  </p>
                  <p className="text-xs text-zinc-500">
                    생성 {d.created_at.slice(0, 10)}
                    {d.sent_on ? ` · 발송 ${d.sent_on}` : " · 미발송"}
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    className="underline text-zinc-700"
                    disabled={busy}
                    onClick={() => loadDraft(d)}
                  >
                    불러오기
                  </button>
                  {!d.sent_on ? (
                    <button
                      type="button"
                      className="underline text-zinc-700"
                      disabled={busy}
                      onClick={() => void onMarkSent(d.id)}
                    >
                      발송 기록
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
