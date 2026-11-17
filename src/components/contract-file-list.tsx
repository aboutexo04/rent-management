import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage";
import Link from "next/link";

export async function ContractFileList() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <p className="text-sm text-zinc-500">로그인 후 업로드 목록을 볼 수 있습니다.</p>
    );
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.contracts)
    .list(user.id, {
      limit: 20,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    return (
      <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        목록을 불러오지 못했습니다: {error.message}
      </p>
    );
  }

  const files = (data ?? []).filter((f) => f.name && f.id);

  if (files.length === 0) {
    return <p className="text-sm text-zinc-500">아직 업로드한 계약서가 없습니다.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded border border-zinc-200 bg-white">
      {files.map((file) => {
        const path = `${user.id}/${file.name}`;
        const params = new URLSearchParams({
          path,
          name: file.name,
        });
        return (
          <li key={file.id ?? file.name} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <span className="truncate text-zinc-800">{file.name}</span>
            <Link
              href={`/app/leases/new/review?${params.toString()}`}
              className="shrink-0 text-zinc-600 underline hover:text-zinc-900"
            >
              확인 폼
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
