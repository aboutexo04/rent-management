"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateLeaseForm } from "@/lib/leases/validate";
import type { LeaseFormValues } from "@/types/lease";

export type SaveLeaseResult =
  | { ok: true; leaseId: string }
  | { ok: false; error: string };

async function requireUserPath(storagePath: string) {
  const path = storagePath.trim();
  if (!path || path.includes("..") || path.startsWith("/")) {
    return { ok: false as const, error: "계약서 파일 경로가 올바르지 않습니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "로그인이 필요합니다." };
  }

  if (!path.startsWith(`${user.id}/`)) {
    return { ok: false as const, error: "이 계약서 파일에 접근할 수 없습니다." };
  }

  return { ok: true as const, supabase, user, path };
}

export async function saveLeaseAction(input: {
  values: LeaseFormValues;
  storagePath: string;
}): Promise<SaveLeaseResult> {
  const validated = validateLeaseForm(input.values);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const auth = await requireUserPath(input.storagePath);
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const { supabase, user, path } = auth;

  const { data: existingProps, error: propQueryError } = await supabase
    .from("properties")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (propQueryError) {
    return { ok: false, error: "건물 정보를 불러오지 못했습니다." };
  }

  let propertyId = existingProps?.[0]?.id;

  if (!propertyId) {
    const { data: createdProp, error: propInsertError } = await supabase
      .from("properties")
      .insert({
        user_id: user.id,
        name: "기본 건물",
      })
      .select("id")
      .single();

    if (propInsertError || !createdProp) {
      return { ok: false, error: "건물 정보를 만들지 못했습니다." };
    }
    propertyId = createdProp.id;
  }

  const { data: lease, error: leaseError } = await supabase
    .from("leases")
    .insert({
      user_id: user.id,
      property_id: propertyId,
      room: validated.data.room,
      tenant_name: validated.data.tenantName,
      first_contract_date: validated.data.firstContractDate,
      current_start_date: validated.data.currentStartDate,
      current_end_date: validated.data.currentEndDate,
      deposit: validated.data.deposit,
      monthly_rent: validated.data.monthlyRent,
      payment_day: validated.data.paymentDay,
      special_terms: validated.data.specialTerms,
      contract_storage_path: path,
    })
    .select("id")
    .single();

  if (leaseError || !lease) {
    return {
      ok: false,
      error: "계약을 저장하지 못했습니다. 입력값을 확인한 뒤 다시 시도하세요.",
    };
  }

  redirect(`/app/leases/${lease.id}`);
}

export async function updateLeaseAction(input: {
  leaseId: string;
  values: LeaseFormValues;
}): Promise<SaveLeaseResult> {
  const validated = validateLeaseForm(input.values);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const { data: updatedRows, error } = await supabase
    .from("leases")
    .update({
      room: validated.data.room,
      tenant_name: validated.data.tenantName,
      first_contract_date: validated.data.firstContractDate,
      current_start_date: validated.data.currentStartDate,
      current_end_date: validated.data.currentEndDate,
      deposit: validated.data.deposit,
      monthly_rent: validated.data.monthlyRent,
      payment_day: validated.data.paymentDay,
      special_terms: validated.data.specialTerms,
    })
    .eq("id", input.leaseId)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return {
      ok: false,
      error: `계약을 수정하지 못했습니다. (${error.code ?? "error"})`,
    };
  }

  if (!updatedRows?.length) {
    return {
      ok: false,
      error: "수정할 계약을 찾지 못했습니다. 홈에서 다시 열어 보세요.",
    };
  }

  redirect(`/app/leases/${updatedRows[0].id}`);
}
