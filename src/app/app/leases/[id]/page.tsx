import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatWon, monthlyCharge, vatOf } from "@/lib/leases/validate";
import { F2Dashboard } from "@/components/f2-dashboard";
import {
  EventTimeline,
  type TimelineEvent,
} from "@/components/event-timeline";
import {
  DraftPanel,
  type DraftEventOption,
  type DraftListItem,
} from "@/components/draft-panel";
import { canonicalizeEventTag } from "@/lib/events/tags";

export const instant = false;

type LeaseDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LeaseDetailPage({
  params,
}: LeaseDetailPageProps) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();

  const { data: lease, error } = await supabase
    .from("leases")
    .select(
      "id, room, tenant_name, first_contract_date, current_start_date, current_end_date, deposit, monthly_rent, management_fee, payment_day, special_terms, contract_storage_path, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !lease) {
    notFound();
  }

  const [{ data: payments }, { data: eventRows }, { data: draftRows }] =
    await Promise.all([
      supabase
        .from("payments")
        .select("period_month, paid_on, amount")
        .eq("lease_id", id)
        .order("paid_on", { ascending: true }),
      supabase
        .from("events")
        .select(
          "id, occurred_on, tag, memo, attachments(id, file_name, storage_path, content_type)",
        )
        .eq("lease_id", id)
        .order("occurred_on", { ascending: false }),
      supabase
        .from("drafts")
        .select("id, kind, body, cited_articles, created_at, sent_on")
        .eq("lease_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const events: TimelineEvent[] = (eventRows ?? []).map((row) => ({
    id: row.id,
    occurred_on: row.occurred_on,
    tag: canonicalizeEventTag(row.tag),
    memo: row.memo,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
  }));

  const draftEvents: DraftEventOption[] = events.map((e) => ({
    id: e.id,
    occurred_on: e.occurred_on,
    tag: e.tag,
    memo: e.memo,
  }));

  const drafts: DraftListItem[] = (draftRows ?? []).map((d) => ({
    id: d.id,
    kind: d.kind,
    body: d.body,
    cited_articles: d.cited_articles ?? [],
    created_at: d.created_at,
    sent_on: d.sent_on,
  }));

  const managementFee = lease.management_fee ?? 0;
  const supply = lease.monthly_rent + managementFee;
  const charge = monthlyCharge(lease.monthly_rent, managementFee);

  const rows: { label: string; value: string }[] = [
    { label: "호실", value: lease.room },
    { label: "임차인", value: lease.tenant_name },
    { label: "최초 계약일", value: lease.first_contract_date },
    { label: "현재 계약 시작일", value: lease.current_start_date },
    { label: "현재 계약 만료일", value: lease.current_end_date },
    { label: "보증금", value: formatWon(lease.deposit) },
    { label: "월 임대료", value: formatWon(lease.monthly_rent) },
    { label: "월 관리비", value: formatWon(managementFee) },
    {
      label: "공급가액 합계",
      value: formatWon(supply),
    },
    {
      label: "부가세(10%)",
      value: formatWon(vatOf(supply)),
    },
    {
      label: "월 차임(합산)",
      value: `${formatWon(charge)} (연체 계산 기준, 부가세 포함)`,
    },
    { label: "납부일", value: `매월 ${lease.payment_day}일` },
    {
      label: "특약",
      value: lease.special_terms?.trim() ? lease.special_terms : "없음",
    },
  ];

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/app" className="text-sm text-zinc-500 underline">
          ← 홈
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">
          계약 상세 · {lease.room}
        </h1>
        <p className="text-sm text-zinc-600">
          저장되었습니다. 법률 자문이 아니며, 기록 정리용입니다.
        </p>
      </div>

      <dl className="divide-y divide-zinc-200 rounded border border-zinc-200 bg-white">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4"
          >
            <dt className="text-sm text-zinc-500">{row.label}</dt>
            <dd className="whitespace-pre-wrap text-sm text-zinc-900">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {lease.contract_storage_path ? (
        <p className="break-all text-xs text-zinc-400">
          계약서 파일: {lease.contract_storage_path}
        </p>
      ) : null}

      <Link
        href={`/app/leases/${lease.id}/edit`}
        className="inline-flex w-fit rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
      >
        계약 수정
      </Link>

      <F2Dashboard lease={lease} payments={payments ?? []} />

      <EventTimeline leaseId={lease.id} events={events} />

      <DraftPanel
        leaseId={lease.id}
        events={draftEvents}
        drafts={drafts}
      />
    </main>
  );
}
