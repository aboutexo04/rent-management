"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

type AuthFormProps = {
  mode: Mode;
  nextPath?: string;
};

export function AuthForm({ mode, nextPath = "/app" }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);

    try {
      const supabase = createClient();

      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        router.replace(nextPath);
        router.refresh();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Confirm email이 켜져 있으면 session이 null → 로그인 페이지로 유도
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!signInError) {
          router.replace(nextPath);
          router.refresh();
          return;
        }
        setInfo(
          "계정이 만들어졌지만 이메일 확인이 필요합니다. Supabase → Authentication → Sign In / Providers → Email → Confirm email 을 끈 뒤, 로그인 탭에서 다시 로그인해 보세요. (이미 만든 유저는 Users에서 Confirm user 가능)",
        );
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
        이메일
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
        비밀번호
        <input
          type="password"
          name="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
        />
      </label>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {info ? (
        <p className="rounded border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          {info}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "처리 중…" : isLogin ? "로그인" : "회원가입"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        {isLogin ? (
          <>
            계정이 없으면{" "}
            <Link href="/signup" className="text-zinc-900 underline">
              회원가입
            </Link>
          </>
        ) : (
          <>
            이미 계정이 있으면{" "}
            <Link href="/login" className="text-zinc-900 underline">
              로그인
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
