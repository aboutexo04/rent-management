import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            회원가입
          </h1>
          <p className="text-sm text-zinc-600">
            MVP용 계정입니다. 본인만 사용합니다.
          </p>
        </div>
        <AuthForm mode="signup" />
      </main>
    </div>
  );
}
