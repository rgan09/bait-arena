-- Bait Arena database schema.
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to re-run.

-- Public game state, readable by anyone in the room (phones + projector).
create table if not exists public.rooms (
  code           text primary key,
  player_a       text not null,
  player_b       text,
  phase          text not null default 'lobby'
                 check (phase in ('lobby','bait','reply','judging','result','recap')),
  turn           int  not null default 0,
  topic          text,
  bait           text,
  reply          text,
  ignored        boolean not null default false,
  phase_ends_at  timestamptz,
  score_a        int not null default 0,
  score_b        int not null default 0,
  last_turn      jsonb,
  version        int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Migration (v2): per-room timers for normal vs quick (demo) mode. Safe to re-run.
alter table public.rooms add column if not exists bait_seconds   int not null default 45;
alter table public.rooms add column if not exists reply_seconds  int not null default 30;
alter table public.rooms add column if not exists reveal_seconds int not null default 12;

-- Secret per-player tokens. NOT readable by the browser — only the server (secret key) can see these.
create table if not exists public.seats (
  room_code  text not null references public.rooms(code) on delete cascade,
  seat       text not null check (seat in ('a','b')),
  name       text not null,
  token      uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  primary key (room_code, seat)
);
create unique index if not exists seats_token_idx on public.seats(token);

-- Every finished turn: feeds the recap + "funniest moment".
create table if not exists public.turns (
  id            bigint generated always as identity primary key,
  room_code     text not null references public.rooms(code) on delete cascade,
  turn          int  not null,
  round         int  not null,
  topic         text not null,
  baiter        text not null,
  replier       text not null,
  bait          text not null,
  reply         text,
  ignored       boolean not null,
  result        jsonb not null,
  bait_points   int not null,
  reply_points  int not null,
  created_at    timestamptz not null default now(),
  unique (room_code, turn)
);

-- Row Level Security: browsers may READ rooms and turns, never write. Seats are server-only.
alter table public.rooms enable row level security;
alter table public.seats enable row level security;
alter table public.turns enable row level security;

drop policy if exists "rooms are public to read" on public.rooms;
create policy "rooms are public to read" on public.rooms for select to anon, authenticated using (true);

drop policy if exists "turns are public to read" on public.turns;
create policy "turns are public to read" on public.turns for select to anon, authenticated using (true);

-- Live updates: phones get pushed every change to rooms/turns.
do $$
begin
  begin alter publication supabase_realtime add table public.rooms; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.turns; exception when duplicate_object then null; end;
end $$;
