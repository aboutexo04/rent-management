# Supabase

클라우드 프로젝트에 스키마·RLS·Storage를 적용합니다.

## 1. 프로젝트 만들기

1. [https://supabase.com/dashboard](https://supabase.com/dashboard) 에서 새 프로젝트
2. **Settings → API** 에서 URL · `anon` · `service_role` 복사
3. 저장소 루트에 `.env.local` 생성:

```bash
cp .env.example .env.local
```

## 2. 마이그레이션 적용

**방법 A — SQL Editor (권장, CLI 불필요)**

1. Dashboard → **SQL Editor**
2. `migrations/20261116000000_init.sql` 전체 붙여넣기 → Run

**방법 B — CLI**

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

## 3. Auth 설정 (D2 오전)

- Authentication → Providers → **Email** 켜기
- Authentication → Providers → Email → **Confirm email** 끄기 (MVP: 가입 직후 로그인)
- 비밀번호 로그인만 사용 (매직링크 미사용)
- 앱 경로: `/signup` 가입 → `/login` 로그인 → `/app` 보호 영역

## 4. 확인 체크리스트

- [ ] Table Editor에 `properties`, `leases`, `payments`, `events`, `attachments`, `drafts`, `law_chunks`
- [ ] 각 테이블 RLS Enabled
- [ ] Storage에 `contracts`, `event-attachments` (private)
- [ ] `.env.local`에 URL · anon key 입력 후 `npm run dev`

## Storage 경로 규칙

업로드 경로는 반드시 `{user_id}/...` 로 시작합니다. RLS가 첫 폴더명 = `auth.uid()` 인지 검사합니다.
