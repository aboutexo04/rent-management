import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { monthlyCharge } from "@/lib/leases/validate";
import { LeaseList } from "@/components/lease-list";

/** 세션 읽기 + Auth 토큰 만료 검사(Date.now) → 요청 시점에만 렌더 */
export const instant = false;

export default function AppHomePage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
      <AppHomeContent />
    </Suspense>
  );
}

async function AppHomeContent() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email =
    typeof data?.claims?.email === "string" ? data.claims.email : null;

  const { data: leases } = await supabase
    .from("leases")
    .select(
      "id, room, tenant_name, current_end_date, monthly_rent, management_fee, created_at",
    )
    .order("created_at", { ascending: false });

  const items = (leases ?? []).map((lease) => ({
    id: lease.id,
    room: lease.room,
    tenant_name: lease.tenant_name,
    current_end_date: lease.current_end_date,
    monthlyCharge: monthlyCharge(
      lease.monthly_rent,
      lease.management_fee ?? 0,
    ),
  }));

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-zinc-900">홈</h1>
        <p className="text-sm text-zinc-600">
          로그인되었습니다
          {email ? (
            <>
              : <span className="font-medium text-zinc-800">{email}</span>
            </>
          ) : null}
          .
        </p>
      </div>

      <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        법률 자문이 아닙니다. 전문가 확인을 권장합니다.
      </p>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-zinc-900">등록된 계약</h2>
          <Link
            href="/app/leases/new"
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            계약 등록
          </Link>
        </div>

        <LeaseList leases={items} />
      </section>
    </main>
  );
}
