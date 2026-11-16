import { signOut } from "@/app/actions/auth";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-3">
          <p className="text-sm font-medium text-zinc-900">
            임대 기록·기한 관리
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-zinc-600 underline hover:text-zinc-900"
            >
              로그아웃
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-8">
        {children}
      </div>
    </div>
  );
}
