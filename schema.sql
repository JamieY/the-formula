-- The Formula — Supabase schema
-- Run in the Supabase SQL editor to recreate the database from scratch.

-- Products (public catalog, populated by import scripts)
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  external_id text unique,
  name        text not null,
  brand       text not null,
  ingredients text,
  image       text,
  source_name text,
  source_url  text,
  created_at  timestamptz not null default now()
);

-- pg_trgm is required for ilike '%…%' index scans (wildcard-on-both-sides)
create extension if not exists pg_trgm;

create index if not exists products_name_trgm on products using gin (name gin_trgm_ops);
create index if not exists products_brand_trgm on products using gin (brand gin_trgm_ops);
create index if not exists products_ing_trgm on products using gin (ingredients gin_trgm_ops);

-- User product log
create table if not exists user_products (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  status     text not null check (status in ('love_it', 'still_using', 'want_to_try', 'abandoned')),
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists user_products_user_id_idx on user_products (user_id);

-- Ingredient / data quality flags submitted by users
create table if not exists formula_flags (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid references products (id) on delete set null,
  user_id    uuid references auth.users (id) on delete set null,
  note       text,
  status     text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

-- Ingredient reference table (populated from INCI dataset)
-- Powers the "click an ingredient to learn about it" feature
create table if not exists ingredient_info (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique,
  scientific_name  text,
  what_is_it       text,
  what_does_it_do  text,
  good_for         text,
  avoid_if         text,
  created_at       timestamptz not null default now()
);

create index if not exists ingredient_info_name_trgm on ingredient_info using gin (name gin_trgm_ops);

-- Row Level Security
alter table products         enable row level security;
alter table ingredient_info  enable row level security;
alter table user_products enable row level security;
alter table formula_flags enable row level security;

-- Products: readable by everyone, writable only by service role (import scripts)
create policy "products_public_read" on products
  for select using (true);

-- Ingredient info: readable by everyone
create policy "ingredient_info_public_read" on ingredient_info
  for select using (true);

-- User log: users see and manage only their own entries
create policy "user_products_select" on user_products
  for select using (auth.uid() = user_id);

create policy "user_products_insert" on user_products
  for insert with check (auth.uid() = user_id);

create policy "user_products_update" on user_products
  for update using (auth.uid() = user_id);

create policy "user_products_delete" on user_products
  for delete using (auth.uid() = user_id);

-- Flags: anyone can submit; only the submitter can see their own
create policy "formula_flags_insert" on formula_flags
  for insert with check (auth.uid() = user_id or user_id is null);

create policy "formula_flags_select" on formula_flags
  for select using (auth.uid() = user_id);
