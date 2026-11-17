import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LeaseEditForm } from "@/components/lease-edit-form";

export const instant = false;

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LeaseEditPage({ params }: EditPageProps) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();

  const { data: lease, error } = await supabase
    .from("leases")
    .select(
      "id, room, tenant_name, first_contract_date, current_start_date, current_end_date, deposit, monthly_rent, management_fee, payment_day, special_terms",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !lease) {
    notFound();
  }

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/app/leases/${id}`}
          className="text-sm text-zinc-500 underline"
        >
          ← 상세
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">계약 수정</h1>
        <p className="text-sm text-zinc-600">
          저장 전에 값을 다시 확인하세요. 법률 자문이 아닙니다.
        </p>
      </div>

      <LeaseEditForm
        leaseId={lease.id}
        initialValues={{
          room: lease.room,
          tenantName: lease.tenant_name,
          firstContractDate: lease.first_contract_date,
          currentStartDate: lease.current_start_date,
          currentEndDate: lease.current_end_date,
          deposit: String(lease.deposit),
          monthlyRent: String(lease.monthly_rent),
          managementFee: String(lease.management_fee ?? 0),
          paymentDay: String(lease.payment_day),
          specialTerms: lease.special_terms ?? "",
        }}
      />
    </main>
  );
}
