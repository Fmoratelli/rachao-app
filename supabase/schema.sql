-- ============================================
-- RACHÃO - schema Supabase
-- Cole tudo isso no SQL Editor do Supabase e rode.
-- ============================================

-- Extensões
create extension if not exists "pgcrypto";

-- ============================================
-- Tabela: players
-- ============================================
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================
-- Tabela: assessments
-- Cada linha = uma pessoa (rater) avaliando outra (ratee)
-- ============================================
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  rater_id uuid not null references public.players(id) on delete cascade,
  ratee_id uuid not null references public.players(id) on delete cascade,
  scores jsonb not null,
  is_self boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(rater_id, ratee_id)
);

create index if not exists idx_assessments_ratee on public.assessments(ratee_id);
create index if not exists idx_assessments_rater on public.assessments(rater_id);

-- ============================================
-- RLS: modelo confiança-de-grupo-de-amigos
-- Qualquer um pode ler e criar/atualizar avaliações.
-- Só usuário logado (admin) pode deletar jogadores.
-- ============================================

alter table public.players enable row level security;
alter table public.assessments enable row level security;

-- players: leitura pública
drop policy if exists "players_select_all" on public.players;
create policy "players_select_all"
  on public.players for select
  using (true);

-- players: qualquer um pode inserir (cadastrar-se)
drop policy if exists "players_insert_all" on public.players;
create policy "players_insert_all"
  on public.players for insert
  with check (true);

-- players: só admin autenticado pode atualizar/deletar
drop policy if exists "players_update_admin" on public.players;
create policy "players_update_admin"
  on public.players for update
  using (auth.role() = 'authenticated');

drop policy if exists "players_delete_admin" on public.players;
create policy "players_delete_admin"
  on public.players for delete
  using (auth.role() = 'authenticated');

-- assessments: leitura pública (o admin precisa ver tudo)
drop policy if exists "assessments_select_all" on public.assessments;
create policy "assessments_select_all"
  on public.assessments for select
  using (true);

-- assessments: qualquer um pode inserir
drop policy if exists "assessments_insert_all" on public.assessments;
create policy "assessments_insert_all"
  on public.assessments for insert
  with check (true);

-- assessments: qualquer um pode atualizar (para editar a própria avaliação)
drop policy if exists "assessments_update_all" on public.assessments;
create policy "assessments_update_all"
  on public.assessments for update
  using (true);

-- assessments: só admin pode deletar
drop policy if exists "assessments_delete_admin" on public.assessments;
create policy "assessments_delete_admin"
  on public.assessments for delete
  using (auth.role() = 'authenticated');
