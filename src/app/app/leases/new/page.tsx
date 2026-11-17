import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { LeaseUploadForm } from "@/components/lease-upload-form";
import { ContractFileList } from "@/components/contract-file-list";

export const instant = false;

export default function NewLeasePage() {
  return (
    <main className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/app" className="text-sm text-zinc-500 underline">
          ← 홈
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">계약 등록</h1>
        <p className="text-sm text-zinc-600">
          계약서 사진·PDF를 올리면 Storage에 저장한 뒤, 확인 화면에서 자동
          추출(초안) → 수정합니다.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-900">새 파일 업로드</h2>
        <LeaseUploadForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-900">업로드된 파일</h2>
        <Suspense
          fallback={<p className="text-sm text-zinc-500">목록 불러오는 중…</p>}
        >
          <ContractListSection />
        </Suspense>
      </section>
    </main>
  );
}

async function ContractListSection() {
  await connection();
  return <ContractFileList />;
}
