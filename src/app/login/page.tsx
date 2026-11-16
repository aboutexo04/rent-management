import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            로그인
          </h1>
          <p className="text-sm text-zinc-600">
            이메일과 비밀번호로 로그인합니다.
          </p>
        </div>
        <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
          <LoginForm searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

async function LoginForm({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath =
    params.next && params.next.startsWith("/") ? params.next : "/app";

  return <AuthForm mode="login" nextPath={nextPath} />;
}
