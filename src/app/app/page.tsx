import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

export default function AppHomePage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
      <AppHomeContent />
    </Suspense>
  );
}

async function AppHomeContent() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email =
    typeof data?.claims?.email === "string" ? data.claims.email : null;

  return (
    <main className="flex flex-col gap-4">
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
      <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        법률 자문이 아닙니다. 전문가 확인을 권장합니다.
      </p>
      <p className="text-sm text-zinc-400">다음: F1 계약 등록 (D2 오후)</p>
    </main>
  );
}
