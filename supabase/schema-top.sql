-- ============================================
-- RACHÃO - cota "top": as mais fortes não ficam todas no mesmo time
-- Rode DEPOIS dos outros schema-*.sql. Aditivo e re-executável.
--
-- ⚠ Três coisas são OBRIGATÓRIAS, não só o alter:
--   1. a coluna
--   2. o GRANT da coluna — players está com privilégio por coluna desde o
--      schema-pin.sql; sem isso, qualquer select que peça is_top dá
--      "permission denied for table players" e TODAS as telas quebram
--   3. get_draw_profiles devolvendo is_top — o /sortear público não lê a
--      tabela, lê essa função; sem isso a cota não vale no sorteio público
-- ============================================

-- ============================================
-- 1. Coluna + grant
-- ============================================
alter table public.players
  add column if not exists is_top boolean not null default false;

grant select (is_top) on public.players to anon, authenticated;

-- ============================================
-- 2. Marca as top (ajuste a lista quando quiser)
-- ============================================
update public.players set is_top = (name in ('Júlia', 'Jô', 'Fabi', 'Brenda'));

-- ============================================
-- 3. get_draw_profiles passa a devolver is_top
-- drop antes do create: o Postgres não deixa trocar o tipo de retorno.
-- ============================================
drop function if exists public.get_draw_profiles(numeric, numeric);

create or replace function public.get_draw_profiles(
  p_self_weight numeric default 0.3,
  p_peer_weight numeric default 0.7
)
returns table (
  id                 uuid,
  name               text,
  position_primary   text,
  position_secondary text,
  is_top             boolean,
  scores             jsonb,
  has_data           boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with keys as (
    select distinct a.ratee_id as player_id, k.key
      from public.assessments a
      cross join lateral jsonb_object_keys(a.scores) as k(key)
  ),
  per_key as (
    select k.player_id, k.key,
      (select (s.scores ->> k.key)::numeric
         from public.assessments s
        where s.rater_id = k.player_id and s.ratee_id = k.player_id
          and s.is_self and s.scores ? k.key) as self_val,
      (select avg((o.scores ->> k.key)::numeric)
         from public.assessments o
        where o.ratee_id = k.player_id and o.rater_id <> k.player_id
          and o.scores ? k.key) as peer_avg
    from keys k
  ),
  finals as (
    select player_id, key,
      case
        when peer_avg is not null and self_val is not null
          then self_val * p_self_weight + peer_avg * p_peer_weight
        when peer_avg is not null then peer_avg
        else self_val
      end as final
    from per_key
  )
  select pl.id, pl.name, pl.position_primary, pl.position_secondary, pl.is_top,
         coalesce((select jsonb_object_agg(f.key, round(f.final, 3))
                     from finals f where f.player_id = pl.id and f.final is not null),
                  '{}'::jsonb) as scores,
         exists (select 1 from finals f where f.player_id = pl.id and f.final is not null) as has_data
    from public.players pl
   where pl.active
   order by pl.name;
$$;

grant execute on function public.get_draw_profiles(numeric, numeric) to anon, authenticated;

-- ============================================
-- Conferência (rode junto, deve listar as 4 com true):
--   select name, is_top from public.players where active order by is_top desc, name;
--   select name, is_top from public.get_draw_profiles() order by is_top desc, name;
-- ============================================
