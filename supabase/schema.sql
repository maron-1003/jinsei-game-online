-- Supabase SQL Editor で実行してください。
create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id text not null,
  status text not null default 'waiting',
  game_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.game_players (
  id text primary key,
  room_code text not null references public.game_rooms(code) on delete cascade,
  name text not null,
  avatar text not null default '🧑',
  color text not null default '#7c8cff',
  ready boolean not null default false,
  player_state jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default now()
);

create index if not exists game_players_room_code_idx
  on public.game_players(room_code);

alter table public.game_rooms enable row level security;
alter table public.game_players enable row level security;

-- MVP用の開発ポリシー。公開運用前に必ず認証・権限検証を追加してください。
create policy "rooms_select_all" on public.game_rooms
  for select to anon, authenticated using (true);
create policy "rooms_insert_all" on public.game_rooms
  for insert to anon, authenticated with check (true);
create policy "rooms_update_all" on public.game_rooms
  for update to anon, authenticated using (true) with check (true);

create policy "players_select_all" on public.game_players
  for select to anon, authenticated using (true);
create policy "players_insert_all" on public.game_players
  for insert to anon, authenticated with check (true);
create policy "players_update_all" on public.game_players
  for update to anon, authenticated using (true) with check (true);
create policy "players_delete_all" on public.game_players
  for delete to anon, authenticated using (true);

-- Realtime > Publications で game_rooms と game_players を有効化してください。
