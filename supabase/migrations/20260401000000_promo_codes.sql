create table promo_codes (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,
  max_free        integer not null default 10,
  resolved_count  integer not null default 0,
  active          boolean default true,
  created_at      timestamptz default now()
);

-- Seed the code
insert into promo_codes (code, max_free) values ('FIRSTTEN', 10);

-- Enable RLS for promo_codes
alter table promo_codes enable row level security;

-- Only service role can insert/update, anyone can select
create policy "Anyone can select active promo codes" 
  on promo_codes for select 
  using (active = true);

alter table cases
add column promo_code text,
add column promo_applied boolean default false,
add column promo_free boolean default false;
