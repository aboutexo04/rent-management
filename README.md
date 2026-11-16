# 임대 기록·기한 관리 (MVP)

상가 임대인의 **계약·연체·사건 기록** 도구. 법률 자문이 아니며, 문서·안내는 모두 초안/참고입니다.

자세한 범위는 [`SPEC.md`](./SPEC.md)를 보세요.

## 스택

- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Auth · Postgres · Storage)
- Claude API (계약 추출 · 내용증명 초안)
- Vitest (F2 계산)

## 시작

```bash
cp .env.example .env.local
# .env.local에 Supabase·Anthropic 키 입력

npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인합니다.

## Supabase 스키마

초기 마이그레이션·RLS·Storage 적용 방법은 [`supabase/README.md`](./supabase/README.md)를 보세요.

```text
supabase/migrations/20261116000000_init.sql
```
