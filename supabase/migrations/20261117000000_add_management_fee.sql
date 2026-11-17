-- 월 관리비 필드. F2 연체 계산의 "차임" = monthly_rent + management_fee
alter table public.leases
  add column if not exists management_fee bigint not null default 0
    check (management_fee >= 0);

comment on column public.leases.management_fee is '월 관리비(원). 연체 계산 시 월 차임에 합산';
comment on column public.leases.monthly_rent is '월 임대료(원). 관리비는 management_fee';
