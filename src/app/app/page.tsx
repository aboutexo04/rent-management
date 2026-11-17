import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
      <Link
        href="/app/leases/new"
        className="inline-flex w-fit rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
      >
        계약 등록하기
      </Link>
      <p className="text-sm text-zinc-400">다음: LLM 추출 + 저장 (D3)</p>
    </main>
  );
}
