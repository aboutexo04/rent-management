import { Suspense } from "react";
import Link from "next/link";
import { LeaseReviewForm } from "@/components/lease-review-form";

export const instant = false;

type ReviewPageProps = {
  searchParams: Promise<{ path?: string; name?: string }>;
};

export default function LeaseReviewPage({ searchParams }: ReviewPageProps) {
  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/app/leases/new" className="text-sm text-zinc-500 underline">
          ← 업로드로
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">계약 정보 확인</h1>
        <p className="text-sm text-zinc-600">
          추출·저장 전 확인·수정 단계의 골격입니다.
        </p>
      </div>

      <Suspense
        fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}
      >
        <ReviewContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ReviewContent({
  searchParams,
}: {
  searchParams: Promise<{ path?: string; name?: string }>;
}) {
  const params = await searchParams;
  const path = params.path?.trim() ?? "";
  const name = params.name?.trim() || "계약서";

  if (!path || path.includes("..")) {
    return (
      <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        업로드 경로가 없습니다.{" "}
        <Link href="/app/leases/new" className="underline">
          다시 업로드
        </Link>
        해 주세요.
      </p>
    );
  }

  return <LeaseReviewForm storagePath={path} fileName={name} />;
}
