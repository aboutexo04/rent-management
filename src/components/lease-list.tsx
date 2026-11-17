"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteLeaseAction } from "@/app/actions/delete-lease";
import { formatWon } from "@/lib/leases/validate";

export type LeaseListItem = {
  id: string;
  room: string;
  tenant_name: string;
  current_end_date: string;
  monthlyCharge: number;
};

type LeaseListProps = {
  leases: LeaseListItem[];
};

export function LeaseList({ leases }: LeaseListProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onDelete(lease: LeaseListItem) {
    if (
      !confirm(
        `"${lease.room} · ${lease.tenant_name}" 계약과 관련 납부·사건·초안·첨부를 모두 삭제할까요?`,
      )
    ) {
      return;
    }
    setError(null);
    setBusyId(lease.id);
    try {
      const result = await deleteLeaseAction({ leaseId: lease.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError("삭제 중 오류가 발생했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  if (leases.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        아직 저장된 계약이 없습니다. 계약서를 올려 등록해 보세요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <ul className="divide-y divide-zinc-200 rounded border border-zinc-200 bg-white">
        {leases.map((lease) => (
          <li
            key={lease.id}
            className="flex items-stretch gap-2 px-3 py-2 sm:items-center"
          >
            <Link
              href={`/app/leases/${lease.id}`}
              className="flex min-w-0 flex-1 flex-col gap-0.5 py-1 hover:opacity-80 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="truncate text-sm font-medium text-zinc-900">
                {lease.room} · {lease.tenant_name}
              </span>
              <span className="text-xs text-zinc-500">
                만료 {lease.current_end_date} · 월 차임{" "}
                {formatWon(lease.monthlyCharge)}
              </span>
            </Link>
            <button
              type="button"
              disabled={busyId === lease.id}
              onClick={() => void onDelete(lease)}
              className="shrink-0 self-center px-2 py-1 text-xs text-red-700 underline disabled:opacity-60"
            >
              {busyId === lease.id ? "삭제 중…" : "삭제"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
