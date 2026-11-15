-- v3: players, Elo, rematch, seeded leaderboard. Safe to re-run.

create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  username    text not null,
  token       uuid not null default gen_random_uuid(),   -- secret login token kept on the player's phone
  elo         int  not null default 1000,
  wins        int  not null default 0,
  losses      int  not null default 0,
  ties        int  not null default 0,
  is_seed     boolean not null default false,
  created_at  timestamptz not null default now()
);
create unique index if not exists players_username_lower_idx on public.players (lower(username));
create unique index if not exists players_token_idx on public.players (token);
alter table public.players enable row level security;   -- no policies: server-only (tokens live here)

alter table public.seats add column if not exists player_id uuid references public.players(id) on delete cascade;

alter table public.rooms add column if not exists player_a_id  uuid references public.players(id) on delete set null;
alter table public.rooms add column if not exists player_b_id  uuid references public.players(id) on delete set null;
alter table public.rooms add column if not exists elo_a        int;
alter table public.rooms add column if not exists elo_b        int;
alter table public.rooms add column if not exists winner       text check (winner in ('a','b','tie'));
alter table public.rooms add column if not exists elo_result   jsonb;
alter table public.rooms add column if not exists rematch_code text;

-- Seed players so the leaderboard isn't empty on demo day.
insert into public.players (username, elo, wins, losses, ties, is_seed) values
  ('cereal_is_soup',      1342, 19, 4, 1, true),
  ('ratio_queen',         1288, 15, 6, 0, true),
  ('unbothered_ub',       1231, 12, 7, 2, true),
  ('trojan_takes',        1176, 10, 8, 1, true),
  ('8am_enjoyer',         1124,  9, 8, 0, true),
  ('dark_mode_hater',     1067,  7, 7, 1, true),
  ('in_n_out_is_mid',     1012,  5, 5, 0, true),
  ('reply_guy_ryan',       958,  4, 7, 0, true),
  ('took_the_bait_again',  903,  2, 8, 1, true),
  ('touch_grass_tom',      861,  1, 9, 0, true)
on conflict do nothing;
