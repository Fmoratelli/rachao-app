-- ============================================
-- RACHÃO - posições + perfis pro sorteio público
-- Rode DEPOIS do schema.sql e do schema-privacy.sql, no SQL Editor.
-- Aditivo e re-executável: não mexe em dados existentes.
--
--   1. players ganha position_primary / position_secondary (nullable,
--      pra não quebrar quem já está cadastrada — a UI pede no 1º acesso).
--   2. save_my_positions: única porta de escrita das posições (players
--      não tem policy de UPDATE pro anon).
--   3. get_draw_profiles: o /sortear é público e assessments está trancada
--      pro anon (schema-privacy). Esta função devolve, por jogadora, só a
--      nota FINAL já combinada por atributo (self × peso + média das outras
--      × peso) — nunca uma avaliação individual. Os pesos vêm do front
--      (attributes.js) pra existir uma fonte só.
-- ============================================

-- ============================================
-- 1. Colunas de posição
-- ============================================
alter table public.players
  add column if not exists position_primary text
    check (position_primary in ('ataque', 'meio', 'defesa')),
  add column if not exists position_secondary text
    check (position_secondary in ('ataque', 'meio', 'defesa'));

-- ============================================
-- 2. Salvar posições
-- ============================================
create or replace function public.save_my_positions(
  p_player_id uuid,
  p_primary   text,
  p_secondary text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_player_id is null then
    raise exception 'player_id obrigatório';
  end if;
  if p_primary is null then
    raise exception 'posição principal obrigatória';
  end if;
  if p_primary not in ('ataque', 'meio', 'defesa') then
    raise exception 'posição principal inválida';
  end if;
  if p_secondary is not null and p_secondary not in ('ataque', 'meio', 'defesa') then
    raise exception 'posição secundária inválida';
  end if;
  if p_secondary is not null and p_secondary = p_primary then
    raise exception 'secundária igual à principal';
  end if;

  update public.players
     set position_primary   = p_primary,
         position_secondary = p_secondary
   where id = p_player_id
     and active;

  if not found then
    raise exception 'jogadora não encontrada ou inativa';
  end if;
end;
$$;

grant execute on function public.save_my_positions(uuid, text, text) to anon, authenticated;

-- ============================================
-- 3. Perfis pro sorteio (público)
-- Devolve cada jogadora ativa com posições e as notas finais por atributo:
--   final = self × p_self_weight + média(outras) × p_peer_weight   (se tem os dois)
--         = média(outras)                                            (só outras)
--         = self                                                     (só self)
-- Chaves vêm do que existe nas avaliações (não fixa a lista de atributos
-- no banco — attributes.js continua mandando). has_data = tem alguma nota.
-- ============================================
create or replace function public.get_draw_profiles(
  p_self_weight numeric default 0.3,
  p_peer_weight numeric default 0.7
)
returns table (
  id                 uuid,
  name               text,
  position_primary   text,
  position_secondary text,
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
  select pl.id, pl.name, pl.position_primary, pl.position_secondary,
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
-- Conferência rápida (opcional):
--   select column_name from information_schema.columns
--    where table_name = 'players' and column_name like 'position%';
--   select * from public.get_draw_profiles();
--   select public.save_my_positions('<uuid>', 'meio', null);
-- ============================================
