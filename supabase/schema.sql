-- TFT Atlas · esquema de base de datos para Supabase
-- Pega este archivo completo en Supabase → SQL Editor → Run.
-- Se puede ejecutar varias veces sin romper nada (también para actualizar una instalación anterior).

-- =====================================================================
-- Composiciones
-- =====================================================================
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
alter table public.comps add column if not exists likes int not null default 0;

create index if not exists comps_owner_idx on public.comps (owner, updated_at desc);
create index if not exists comps_public_idx on public.comps (set, updated_at desc) where is_public;
create index if not exists comps_popular_idx on public.comps (set, likes desc, updated_at desc) where is_public;

-- Al crear: el contador de «me gusta» siempre empieza en 0
create or replace function public.comps_insert() returns trigger
language plpgsql as $$
begin
  new.likes := 0;
  return new;
end $$;

drop trigger if exists comps_insert on public.comps;
create trigger comps_insert before insert on public.comps
  for each row execute function public.comps_insert();

-- Al editar: updated_at automático; nadie puede cambiar el dueño ni el contador a mano.
-- Cuando el cambio viene del contador de «me gusta» (trigger anidado) solo se toca `likes`.
create or replace function public.comps_touch() returns trigger
language plpgsql as $$
begin
  new.owner := old.owner;
  if pg_trigger_depth() <= 1 then
    new.likes := old.likes;
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
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

-- =====================================================================
-- «Me gusta»: un voto por usuario y comp
-- =====================================================================
create table if not exists public.comp_likes (
  comp_id    uuid not null references public.comps (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comp_id, user_id)
);
create index if not exists comp_likes_user_idx on public.comp_likes (user_id);

alter table public.comp_likes enable row level security;

drop policy if exists "likes: ver los míos" on public.comp_likes;
create policy "likes: ver los míos" on public.comp_likes
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "likes: dar" on public.comp_likes;
create policy "likes: dar" on public.comp_likes
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.comps c where c.id = comp_id and c.is_public)
  );

drop policy if exists "likes: quitar" on public.comp_likes;
create policy "likes: quitar" on public.comp_likes
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, delete on public.comp_likes to authenticated;

-- Mantiene comps.likes al día (se ejecuta con permisos del dueño de la tabla)
create or replace function public.comp_likes_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.comps set likes = likes + 1 where id = new.comp_id;
  else
    update public.comps set likes = greatest(likes - 1, 0) where id = old.comp_id;
  end if;
  return null;
end $$;

drop trigger if exists comp_likes_count on public.comp_likes;
create trigger comp_likes_count after insert or delete on public.comp_likes
  for each row execute function public.comp_likes_count();
