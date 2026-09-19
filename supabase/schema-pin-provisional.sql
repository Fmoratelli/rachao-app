-- ============================================
-- RACHÃO - PIN provisório (0000) com troca obrigatória no 1º acesso
-- Rode DEPOIS do schema-pin.sql. Aditivo e re-executável.
--
--   1. players.pin_provisional (boolean, default false) + grant de coluna
--      (players está com privilégio por coluna desde o schema-pin.sql).
--   2. Marca como provisória quem está com o PIN 0000 — pelo hash, não
--      pelo nome. Re-rodar marca qualquer nova jogadora com 0000.
--   3. set_player_pin passa a aceitar quando o PIN é provisório (é assim que
--      a troca forçada grava o PIN novo sem pedir o 0000) e zera a flag.
--      change_player_pin e reset_player_pin também zeram a flag.
--
-- ⚠ O front (PLAYER_COLS) seleciona pin_provisional: rode isto ANTES do deploy.
-- ============================================

-- ============================================
-- 1. Coluna + grant
-- ============================================
alter table public.players
  add column if not exists pin_provisional boolean not null default false;

grant select (pin_provisional) on public.players to anon, authenticated;

-- ============================================
-- 2. Marca quem está com 0000
-- ============================================
update public.players
   set pin_provisional = true
 where active
   and pin_hash is not null
   and pin_hash = extensions.crypt('0000', pin_hash);

-- ============================================
-- 3. RPCs
-- ============================================

-- Cria o PIN. Aceita se ainda não existe OU se o atual é provisório.
create or replace function public.set_player_pin(p_player_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_has boolean;
  v_prov boolean;
begin
  if p_player_id is null then
    raise exception 'player_id obrigatório';
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN precisa ter exatamente 4 dígitos';
  end if;

  select (pin_hash is not null), pin_provisional into v_has, v_prov
    from public.players
   where id = p_player_id and active;
  if not found then
    raise exception 'jogadora não encontrada ou inativa';
  end if;
  if v_has and not v_prov then
    raise exception 'essa jogadora já tem PIN — use "trocar PIN" ou peça reset pra técnica';
  end if;

  update public.players
     set pin_hash        = extensions.crypt(p_pin, extensions.gen_salt('bf', 8)),
         pin_provisional = false
   where id = p_player_id;
end;
$$;

-- Troca o PIN. Exige o atual. Zera a flag de provisório.
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
     set pin_hash        = extensions.crypt(p_new_pin, extensions.gen_salt('bf', 8)),
         pin_provisional = false
   where id = p_player_id;
end;
$$;

-- Zera o PIN e a flag. Só admin autenticado.
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
     set pin_hash        = null,
         pin_provisional = false
   where id = p_player_id;
  if not found then
    raise exception 'jogadora não encontrada';
  end if;
end;
$$;

-- grants já existem (schema-pin.sql); reforça por segurança
grant execute on function public.set_player_pin(uuid, text)          to anon, authenticated;
grant execute on function public.change_player_pin(uuid, text, text) to anon, authenticated;
revoke execute on function public.reset_player_pin(uuid) from public, anon;
grant  execute on function public.reset_player_pin(uuid) to authenticated;

-- ============================================
-- Conferência rápida (opcional):
--   select name, has_pin, pin_provisional from public.players
--    where active order by pin_provisional desc, name;
--     → Fabi false, as 12 com 0000 true
-- ============================================
