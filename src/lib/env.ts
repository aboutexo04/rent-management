/**
 * 환경 변수 접근 헬퍼.
 * 값이 비어 있으면 null — 셋업 전에는 throw하지 않음.
 */

export function getPublicEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null,
  };
}

export function getServerEnv() {
  return {
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? null,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? null,
    timezone: process.env.APP_TIMEZONE ?? "Asia/Seoul",
  };
}
