-- =====================================================================
-- Starly: liga entre amigos
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo → Run.
-- Se puede correr más de una vez sin romper nada.
-- =====================================================================

-- 1) Datos de la liga en el perfil de cada estudiante
alter table public.profiles
  add column if not exists friend_code text,
  add column if not exists xp integer not null default 0,
  add column if not exists week_xp integer not null default 0,
  add column if not exists week_key text,
  add column if not exists level smallint,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profiles_friend_code_key on public.profiles (friend_code);

-- 2) Amistades (si A agrega a B, los dos se ven en su liga de amigos)
create table if not exists public.friendships (
  user_id    uuid not null references auth.users(id) on delete cascade,
  friend_id  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

alter table public.profiles   enable row level security;
alter table public.friendships enable row level security;

-- 3) Permisos (RLS)
-- Amistades: cada quien ve y borra las suyas, y solo puede crear las propias.
drop policy if exists "starly_friendships_select" on public.friendships;
create policy "starly_friendships_select" on public.friendships
  for select to authenticated using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "starly_friendships_insert" on public.friendships;
create policy "starly_friendships_insert" on public.friendships
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "starly_friendships_delete" on public.friendships;
create policy "starly_friendships_delete" on public.friendships
  for delete to authenticated using (auth.uid() = user_id or auth.uid() = friend_id);

-- Perfiles: cada quien ve el suyo y el de sus amigos (nadie más). Solo edita el suyo.
drop policy if exists "starly_profiles_select" on public.profiles;
create policy "starly_profiles_select" on public.profiles
  for select to authenticated using (
    auth.uid() = id
    or exists (
      select 1 from public.friendships f
      where (f.user_id = auth.uid() and f.friend_id = profiles.id)
         or (f.friend_id = auth.uid() and f.user_id = profiles.id)
    )
  );

drop policy if exists "starly_profiles_insert" on public.profiles;
create policy "starly_profiles_insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "starly_profiles_update" on public.profiles;
create policy "starly_profiles_update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- 4) Agregar amigo por código, sin poder ver los perfiles de desconocidos
create or replace function public.add_friend(code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  fid uuid;
  fname text;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'no_session');
  end if;
  select id, nombre into fid, fname from public.profiles where friend_code = upper(trim(code));
  if fid is null then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;
  if fid = auth.uid() then
    return json_build_object('ok', false, 'error', 'self');
  end if;
  insert into public.friendships (user_id, friend_id) values (auth.uid(), fid) on conflict do nothing;
  return json_build_object('ok', true, 'nombre', coalesce(fname, 'Tu amigo'));
end;
$$;

revoke all on function public.add_friend(text) from public, anon;
grant execute on function public.add_friend(text) to authenticated;
