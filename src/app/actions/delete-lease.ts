"use server";

import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage";

export type DeleteLeaseResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteLeaseAction(input: {
  leaseId: string;
}): Promise<DeleteLeaseResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const { data: lease } = await supabase
    .from("leases")
    .select("id, property_id, contract_storage_path")
    .eq("id", input.leaseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!lease) {
    return { ok: false, error: "계약을 찾을 수 없습니다." };
  }

  const { data: events } = await supabase
    .from("events")
    .select("id")
    .eq("lease_id", lease.id)
    .eq("user_id", user.id);

  const eventIds = (events ?? []).map((e) => e.id);
  if (eventIds.length > 0) {
    const { data: attachments } = await supabase
      .from("attachments")
      .select("storage_path")
      .eq("user_id", user.id)
      .in("event_id", eventIds);

    const paths = (attachments ?? [])
      .map((a) => a.storage_path)
      .filter(Boolean);
    if (paths.length > 0) {
      await supabase.storage
        .from(STORAGE_BUCKETS.eventAttachments)
        .remove(paths);
    }
  }

  if (lease.contract_storage_path) {
    await supabase.storage
      .from(STORAGE_BUCKETS.contracts)
      .remove([lease.contract_storage_path]);
  }

  const propertyId = lease.property_id;

  const { error } = await supabase
    .from("leases")
    .delete()
    .eq("id", lease.id)
    .eq("user_id", user.id);

  if (error) {
    return {
      ok: false,
      error: `계약을 삭제하지 못했습니다. (${error.message})`,
    };
  }

  // 다른 계약이 없는 property면 정리 (FK restrict)
  const { count } = await supabase
    .from("leases")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId)
    .eq("user_id", user.id);

  if (count === 0) {
    await supabase
      .from("properties")
      .delete()
      .eq("id", propertyId)
      .eq("user_id", user.id);
  }

  return { ok: true };
}
