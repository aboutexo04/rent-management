"use server";

import { createClient } from "@/lib/supabase/server";

export type SavePaymentResult =
  | { ok: true }
  | { ok: false; error: string };

export async function addPaymentAction(input: {
  leaseId: string;
  periodMonth: string;
  paidOn: string;
  amount: string;
  note?: string;
}): Promise<SavePaymentResult> {
  const period = input.periodMonth.trim();
  const paidOn = input.paidOn.trim();
  const amountDigits = input.amount.replace(/[^\d]/g, "");

  if (!/^\d{4}-\d{2}-01$/.test(period)) {
    return { ok: false, error: "대상 월은 YYYY-MM-01 형식이어야 합니다." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) {
    return { ok: false, error: "납부일을 확인하세요." };
  }
  const amount = Number(amountDigits);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    return { ok: false, error: "납부 금액이 올바르지 않습니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const { data: lease } = await supabase
    .from("leases")
    .select("id")
    .eq("id", input.leaseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!lease) {
    return { ok: false, error: "계약을 찾을 수 없습니다." };
  }

  const { error } = await supabase.from("payments").insert({
    user_id: user.id,
    lease_id: input.leaseId,
    period_month: period,
    paid_on: paidOn,
    amount,
    note: input.note?.trim() || null,
  });

  if (error) {
    return {
      ok: false,
      error: `납부 기록을 저장하지 못했습니다. (${error.message})`,
    };
  }

  // revalidatePath 대신 클라이언트 router.refresh()로 갱신
  return { ok: true };
}
