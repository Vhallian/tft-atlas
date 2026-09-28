-- TFT Atlas · esquema de base de datos para Supabase
-- Pega este archivo completo en Supabase → SQL Editor → Run.
-- Se puede ejecutar varias veces sin romper nada.

create table if not exists public.comps (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author      text not null default '',
  name        text not null default '',
  set         int  not null,
  tier        text not null default 'A',
  playstyle   text not null default '',
  is_public   boolean not null default false,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint comps_name_len check (char_length(name) <= 120),
  constraint comps_author_len check (char_length(author) <= 60),
  constraint comps_data_size check (pg_column_size(data) < 200000)
);

create index if not exists comps_owner_idx on public.comps (owner, updated_at desc);
create index if not exists comps_public_idx on public.comps (set, updated_at desc) where is_public;

-- updated_at automático
create or replace function public.comps_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.owner := old.owner; -- nadie puede cambiar el dueño de una comp
  return new;
end $$;

drop trigger if exists comps_touch on public.comps;
create trigger comps_touch before update on public.comps
  for each row execute function public.comps_touch();

-- Seguridad a nivel de fila: cada usuario solo toca lo suyo
alter table public.comps enable row level security;

drop policy if exists "comps: leer públicas o propias" on public.comps;
create policy "comps: leer públicas o propias" on public.comps
  for select using (is_public or owner = auth.uid());

drop policy if exists "comps: crear propias" on public.comps;
create policy "comps: crear propias" on public.comps
  for insert to authenticated with check (owner = auth.uid());

drop policy if exists "comps: editar propias" on public.comps;
create policy "comps: editar propias" on public.comps
  for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "comps: borrar propias" on public.comps;
create policy "comps: borrar propias" on public.comps
  for delete to authenticated using (owner = auth.uid());

grant select on public.comps to anon, authenticated;
grant insert, update, delete on public.comps to authenticated;
