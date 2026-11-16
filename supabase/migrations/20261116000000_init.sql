-- D1 오후: 초기 스키마 + RLS + Storage
-- 적용: Supabase Dashboard → SQL Editor 에 붙여넣기 실행
-- 또는: supabase db push (프로젝트 링크 후)

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '기본 건물',
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.properties is '건물(MVP: 호실 1건 전제, 최소 레코드)';

create table public.leases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete restrict,
  room text not null,
  tenant_name text not null,
  first_contract_date date not null,
  current_start_date date not null,
  current_end_date date not null,
  deposit bigint not null check (deposit >= 0),
  monthly_rent bigint not null check (monthly_rent >= 0),
  payment_day smallint not null check (payment_day between 1 and 31),
  special_terms text,
  contract_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.leases is 'F1 계약. 금액은 원 단위 정수(bigint)';

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lease_id uuid not null references public.leases (id) on delete cascade,
  period_month date not null,
  paid_on date not null,
  amount bigint not null check (amount >= 0),
  note text,
  created_at timestamptz not null default now(),
  constraint payments_period_month_first_day check (
    extract(day from period_month) = 1
  )
);

comment on column public.payments.period_month is '대상 월 — 항상 해당 월 1일';

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lease_id uuid not null references public.leases (id) on delete cascade,
  occurred_on date not null,
  tag text not null check (
    tag in (
      '무단전대 정황',
      '차임 연체',
      '시설 훼손',
      '통지·발송',
      '연락 기록',
      '기타'
    )
  ),
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  storage_path text not null,
  file_name text,
  content_type text,
  created_at timestamptz not null default now()
);

create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lease_id uuid not null references public.leases (id) on delete cascade,
  kind text not null check (
    kind in (
      '무단전대_소명요청',
      '갱신거절_통지',
      '연체차임_독촉'
    )
  ),
  body text not null,
  cited_articles text[] not null default '{}',
  created_at timestamptz not null default now(),
  sent_on date
);

-- 2주차 RAG용. embedding은 인제스트 시 채움
create table public.law_chunks (
  id uuid primary key default gen_random_uuid(),
  article_no text not null,
  body text not null,
  embedding vector(1536),
  body_tsv tsvector generated always as (
    to_tsvector('simple', coalesce(article_no, '') || ' ' || coalesce(body, ''))
  ) stored,
  created_at timestamptz not null default now()
);

create index law_chunks_body_tsv_idx on public.law_chunks using gin (body_tsv);
-- ivfflat는 데이터 적힌 뒤 생성 권장. 일단 주석
-- create index law_chunks_embedding_idx on public.law_chunks
--   using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index properties_user_id_idx on public.properties (user_id);
create index leases_user_id_idx on public.leases (user_id);
create index leases_property_id_idx on public.leases (property_id);
create index payments_lease_id_idx on public.payments (lease_id);
create index payments_user_id_idx on public.payments (user_id);
create index events_lease_id_idx on public.events (lease_id);
create index events_user_id_idx on public.events (user_id);
create index events_occurred_on_idx on public.events (occurred_on);
create index attachments_event_id_idx on public.attachments (event_id);
create index drafts_lease_id_idx on public.drafts (lease_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

create trigger leases_set_updated_at
  before update on public.leases
  for each row execute function public.set_updated_at();

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: 본인 행만 (law_chunks는 인증 사용자 읽기 전용)
-- ---------------------------------------------------------------------------

alter table public.properties enable row level security;
alter table public.leases enable row level security;
alter table public.payments enable row level security;
alter table public.events enable row level security;
alter table public.attachments enable row level security;
alter table public.drafts enable row level security;
alter table public.law_chunks enable row level security;

create policy "properties_select_own"
  on public.properties for select
  using (auth.uid() = user_id);
create policy "properties_insert_own"
  on public.properties for insert
  with check (auth.uid() = user_id);
create policy "properties_update_own"
  on public.properties for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "properties_delete_own"
  on public.properties for delete
  using (auth.uid() = user_id);

create policy "leases_select_own"
  on public.leases for select
  using (auth.uid() = user_id);
create policy "leases_insert_own"
  on public.leases for insert
  with check (auth.uid() = user_id);
create policy "leases_update_own"
  on public.leases for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "leases_delete_own"
  on public.leases for delete
  using (auth.uid() = user_id);

create policy "payments_select_own"
  on public.payments for select
  using (auth.uid() = user_id);
create policy "payments_insert_own"
  on public.payments for insert
  with check (auth.uid() = user_id);
create policy "payments_update_own"
  on public.payments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "payments_delete_own"
  on public.payments for delete
  using (auth.uid() = user_id);

create policy "events_select_own"
  on public.events for select
  using (auth.uid() = user_id);
create policy "events_insert_own"
  on public.events for insert
  with check (auth.uid() = user_id);
create policy "events_update_own"
  on public.events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "events_delete_own"
  on public.events for delete
  using (auth.uid() = user_id);

create policy "attachments_select_own"
  on public.attachments for select
  using (auth.uid() = user_id);
create policy "attachments_insert_own"
  on public.attachments for insert
  with check (auth.uid() = user_id);
create policy "attachments_update_own"
  on public.attachments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "attachments_delete_own"
  on public.attachments for delete
  using (auth.uid() = user_id);

create policy "drafts_select_own"
  on public.drafts for select
  using (auth.uid() = user_id);
create policy "drafts_insert_own"
  on public.drafts for insert
  with check (auth.uid() = user_id);
create policy "drafts_update_own"
  on public.drafts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "drafts_delete_own"
  on public.drafts for delete
  using (auth.uid() = user_id);

create policy "law_chunks_select_authenticated"
  on public.law_chunks for select
  to authenticated
  using (true);

-- law_chunks 쓰기는 service role / 대시보드만 (정책 없음 = 일반 유저 불가)

-- ---------------------------------------------------------------------------
-- Storage buckets + policies
-- path 규칙: {user_id}/...
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'contracts',
    'contracts',
    false,
    20971520,
    array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif'
    ]
  ),
  (
    'event-attachments',
    'event-attachments',
    false,
    20971520,
    array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif'
    ]
  )
on conflict (id) do nothing;

-- contracts
create policy "contracts_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "contracts_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "contracts_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "contracts_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- event-attachments
create policy "event_attachments_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'event-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "event_attachments_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "event_attachments_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'event-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'event-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "event_attachments_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'event-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
