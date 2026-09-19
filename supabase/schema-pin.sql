-- ============================================
-- RACHÃO - PIN de 4 dígitos por jogadora
-- Rode DEPOIS de schema.sql, schema-privacy.sql e schema-positions.sql.
-- Aditivo e re-executável.
--
--   1. players.pin_hash (bcrypt) + has_pin (coluna gerada, pública).
--   2. pin_hash fica INVISÍVEL pra anon/authenticated: o SELECT de tabela é
--      revogado e concedido coluna a coluna. Sem isso qualquer um leria o hash
--      pelo console — e bcrypt de 4 dígitos se quebra offline em segundos.
--      ⚠ Consequência: select('*') em players passa a falhar; o front usa
--        lista explícita (PLAYER_COLS). Coluna nova no futuro = grant novo aqui.
--   3. RPCs (security definer, search_path vazio, extensions.crypt):
--        set_player_pin     — cria; recusa se já existe (senão qualquer um
--                             sobrescreveria o PIN de outra pelo console)
--        verify_player_pin  — null = sem PIN, true/false = confere
--        change_player_pin  — exige o atual
--        reset_player_pin   — só admin autenticado; zera o hash
--
-- Limite: o PIN é uma trava da interface. As RPCs de dados continuam
-- aceitando qualquer p_rater_id; fechar isso exige token de sessão.
-- ============================================

create extension if not exists pgcrypto with schema extensions;

-- ============================================
-- 1. Colunas
-- ============================================
alter table public.players
  add column if not exists pin_hash text,
  add column if not exists has_pin boolean
    generated always as (pin_hash is not null) stored;

-- ============================================
-- 2. Esconde pin_hash (privilégio de coluna)
-- ============================================
revoke select on table public.players from anon, authenticated;
grant select (id, name, active, created_at, position_primary, position_secondary, has_pin)
  on public.players to anon, authenticated;

-- ============================================
-- 3. RPCs
-- ============================================

-- Cria o PIN. Só quando ainda não existe.
create or replace function public.set_player_pin(p_player_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_has boolean;
begin
  if p_player_id is null then
    raise exception 'player_id obrigatório';
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN precisa ter exatamente 4 dígitos';
  end if;

  select (pin_hash is not null) into v_has
    from public.players
   where id = p_player_id and active;
  if not found then
    raise exception 'jogadora não encontrada ou inativa';
  end if;
  if v_has then
    raise exception 'essa jogadora já tem PIN — use "trocar PIN" ou peça reset pra técnica';
  end if;

  update public.players
     set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 8))
   where id = p_player_id;
end;
$$;

-- Confere o PIN. null = ainda não tem PIN (ou jogadora inexistente/inativa).
create or replace function public.verify_player_pin(p_player_id uuid, p_pin text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hash text;
begin
  select pin_hash into v_hash
    from public.players
   where id = p_player_id and active;
  if not found or v_hash is null then
    return null;
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    return false;
  end if;
  return v_hash = extensions.crypt(p_pin, v_hash);
end;
$$;

-- Troca o PIN. Exige o atual.
create or replace function public.change_player_pin(
  p_player_id   uuid,
  p_current_pin text,
  p_new_pin     text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
begin
  if p_new_pin is null or p_new_pin !~ '^[0-9]{4}$' then
    raise exception 'novo PIN precisa ter exatamente 4 dígitos';
  end if;

  select pin_hash into v_hash
    from public.players
   where id = p_player_id and active;
  if not found then
    raise exception 'jogadora não encontrada ou inativa';
  end if;
  if v_hash is null then
    raise exception 'essa jogadora ainda não tem PIN';
  end if;
  if p_current_pin is null or v_hash <> extensions.crypt(p_current_pin, v_hash) then
    raise exception 'PIN atual incorreto';
  end if;

  update public.players
     set pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf', 8))
   where id = p_player_id;
end;
$$;

-- Zera o PIN (jogadora cria outro no próximo acesso). Só admin autenticado:
-- checado pelo JWT dentro da função E pelo grant (anon nem consegue chamar).
create or replace function public.reset_player_pin(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'authenticated' then
    raise exception 'só a técnica pode resetar PIN';
  end if;

  update public.players
     set pin_hash = null
   where id = p_player_id;
  if not found then
    raise exception 'jogadora não encontrada';
  end if;
end;
$$;

-- ============================================
-- 4. Permissões de execução
-- ============================================
grant execute on function public.set_player_pin(uuid, text)                 to anon, authenticated;
grant execute on function public.verify_player_pin(uuid, text)              to anon, authenticated;
grant execute on function public.change_player_pin(uuid, text, text)        to anon, authenticated;

revoke execute on function public.reset_player_pin(uuid) from public, anon;
grant  execute on function public.reset_player_pin(uuid) to authenticated;

-- ============================================
-- Conferência rápida (opcional):
--   select column_name from information_schema.column_privileges
--    where table_name = 'players' and grantee = 'anon' order by 1;
--     → tudo menos pin_hash
--   select public.verify_player_pin('<uuid>', '0000');   → null (sem PIN)
--   select public.set_player_pin('<uuid>', '1234');
--   select public.verify_player_pin('<uuid>', '1234');   → true
--   select public.verify_player_pin('<uuid>', '0000');   → false
-- ============================================
