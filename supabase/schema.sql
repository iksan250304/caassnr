-- =========================================================
-- CAAS — Content Approval Artwork System
-- Jalankan seluruh file ini di Supabase SQL Editor (satu kali)
-- =========================================================

-- 1. PROFILES ------------------------------------------------
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text check (role in ('design', 'product', 'purchasing', 'admin')) not null,
  signature_url text,
  created_at timestamp with time zone default now()
);

alter table profiles enable row level security;

-- 2. ARTWORKS --------------------------------------------------
create table if not exists artworks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_url text not null,
  version int default 1,
  status text check (
    status in ('draft', 'pending_product', 'approved_product', 'rejected_product', 'printed')
  ) default 'pending_product',
  created_by uuid references profiles(id),
  created_at timestamp with time zone default now()
);

alter table artworks enable row level security;

-- 3. APPROVAL LOGS ----------------------------------------------
create table if not exists approval_logs (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid references artworks(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text check (action in ('submitted', 'approved', 'rejected', 'sent_to_print')) not null,
  feedback_notes text,
  annotated_pdf_url text,
  signed_at timestamp with time zone default now()
);

alter table approval_logs enable row level security;

-- =========================================================
-- Helper function: current user's role (bypasses RLS recursion)
-- =========================================================
create or replace function auth_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- =========================================================
-- RLS POLICIES: profiles
-- =========================================================
drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin"
  on profiles for select
  using ( auth.uid() = id or auth_role() = 'admin' or auth_role() is not null );
  -- any authenticated user can see the name/role directory (needed to show
  -- "reviewed by X" on tickets); only admin can write.

drop policy if exists "profiles_insert_admin" on profiles;
create policy "profiles_insert_admin"
  on profiles for insert
  with check ( auth_role() = 'admin' or auth.uid() = id );

drop policy if exists "profiles_update_admin_or_self_signature" on profiles;
create policy "profiles_update_admin_or_self_signature"
  on profiles for update
  using ( auth_role() = 'admin' or auth.uid() = id );

drop policy if exists "profiles_delete_admin" on profiles;
create policy "profiles_delete_admin"
  on profiles for delete
  using ( auth_role() = 'admin' );

-- =========================================================
-- RLS POLICIES: artworks
-- =========================================================
drop policy if exists "artworks_select_all_authenticated" on artworks;
create policy "artworks_select_all_authenticated"
  on artworks for select
  using ( auth.role() = 'authenticated' );

drop policy if exists "artworks_insert_design_or_admin" on artworks;
create policy "artworks_insert_design_or_admin"
  on artworks for insert
  with check ( auth_role() in ('design', 'admin') and created_by = auth.uid() );

-- Design: can update own artworks only while still a draft or after a rejection (new revision)
drop policy if exists "artworks_update_design_own" on artworks;
create policy "artworks_update_design_own"
  on artworks for update
  using (
    created_by = auth.uid()
    and auth_role() = 'design'
    and status in ('draft', 'rejected_product')
  );

-- Product team: can move pending_product -> approved_product / rejected_product
drop policy if exists "artworks_update_product_review" on artworks;
create policy "artworks_update_product_review"
  on artworks for update
  using ( auth_role() = 'product' and status = 'pending_product' );

-- Purchasing: can move approved_product -> printed
drop policy if exists "artworks_update_purchasing_print" on artworks;
create policy "artworks_update_purchasing_print"
  on artworks for update
  using ( auth_role() = 'purchasing' and status = 'approved_product' );

-- Admin: full update rights, but printed rows are protected by trigger below
drop policy if exists "artworks_update_admin" on artworks;
create policy "artworks_update_admin"
  on artworks for update
  using ( auth_role() = 'admin' );

-- Nobody may delete a printed artwork; admin may delete non-printed ones
drop policy if exists "artworks_delete_admin_non_printed" on artworks;
create policy "artworks_delete_admin_non_printed"
  on artworks for delete
  using ( auth_role() = 'admin' and status <> 'printed' );

-- =========================================================
-- RLS POLICIES: approval_logs
-- =========================================================
drop policy if exists "logs_select_all_authenticated" on approval_logs;
create policy "logs_select_all_authenticated"
  on approval_logs for select
  using ( auth.role() = 'authenticated' );

drop policy if exists "logs_insert_actor" on approval_logs;
create policy "logs_insert_actor"
  on approval_logs for insert
  with check ( actor_id = auth.uid() );

-- logs are an audit trail: no update or delete allowed by anyone via the API
drop policy if exists "logs_no_update" on approval_logs;
drop policy if exists "logs_no_delete" on approval_logs;

-- =========================================================
-- TRIGGER: lock printed artworks (integrity of audit trail)
-- =========================================================
create or replace function prevent_printed_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'printed' then
    raise exception 'Dokumen berstatus printed terkunci dan tidak dapat diubah.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_printed_mutation on artworks;
create trigger trg_prevent_printed_mutation
  before update on artworks
  for each row execute function prevent_printed_mutation();

create or replace function prevent_printed_delete()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'printed' then
    raise exception 'Dokumen berstatus printed terkunci dan tidak dapat dihapus.';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_printed_delete on artworks;
create trigger trg_prevent_printed_delete
  before delete on artworks
  for each row execute function prevent_printed_delete();

-- =========================================================
-- STORAGE: bucket for artwork PDFs (max 10 MB, pdf only)
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('artworks', 'artworks', false, 10485760, array['application/pdf'])
on conflict (id) do update
  set file_size_limit = 10485760, allowed_mime_types = array['application/pdf'];

drop policy if exists "storage_read_authenticated" on storage.objects;
create policy "storage_read_authenticated"
  on storage.objects for select
  using ( bucket_id = 'artworks' and auth.role() = 'authenticated' );

drop policy if exists "storage_insert_authenticated" on storage.objects;
create policy "storage_insert_authenticated"
  on storage.objects for insert
  with check ( bucket_id = 'artworks' and auth.role() = 'authenticated' );

drop policy if exists "storage_update_own_or_admin" on storage.objects;
create policy "storage_update_own_or_admin"
  on storage.objects for update
  using ( bucket_id = 'artworks' and auth.role() = 'authenticated' );

-- =========================================================
-- Seed: create your first admin AFTER creating the auth user
-- in the Supabase Dashboard (Authentication -> Users -> Add user).
-- Then run, substituting the UUID shown for that user:
--
-- insert into profiles (id, full_name, role)
-- values ('PASTE-USER-UUID-HERE', 'Nama Admin', 'admin');
-- =========================================================
