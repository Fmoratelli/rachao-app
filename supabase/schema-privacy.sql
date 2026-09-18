-- ============================================
-- RACHÃO - camada de privacidade
-- Rode DEPOIS do schema.sql, no SQL Editor do Supabase.
-- Aditivo: não apaga nem altera dados existentes. Pode rodar de novo.
--
-- O que muda:
--   - Anônimo não lê a tabela assessments direto (só o admin logado).
--   - O jogador consulta seu progresso e edita suas notas por funções (RPC)
--     que devolvem só o necessário — nunca as notas dos outros.
--   - Toda escrita de jogador passa pela save_my_assessment (com validações).
--     INSERT/UPDATE direto na tabela fica sem policy = bloqueado.
-- ============================================

-- ============================================
-- 1. RLS: fecha assessments pra anon
-- ============================================

-- policies do modelo aberto (schema.sql)
drop policy if exists "assessments_select_all" on public.assessments;
drop policy if exists "assessments_insert_all" on public.assessments;
drop policy if exists "assessments_update_all" on public.assessments;

-- leitura: só admin autenticado
drop policy if exists "assessments_select_admin" on public.assessments;
create policy "assessments_select_admin"
  on public.assessments for select
  using (auth.role() = 'authenticated');

-- insert/update: sem policy → ninguém escreve direto (as RPCs abaixo ignoram RLS).
-- delete: continua a assessments_delete_admin do schema.sql (só admin).

-- ============================================
-- 2. RPCs
-- security definer = roda como o dono da tabela, passando por cima do RLS.
-- search_path vazio + nomes qualificados (public.x) = sem sequestro de search_path.
-- ============================================

-- Progresso do jogador: fez auto-avaliação? quais coleguinhas já avaliou?
-- Devolve só IDs. Nenhuma nota sai daqui.
create or replace function public.get_my_progress(p_rater_id uuid)
returns table (self_done boolean, rated_ids uuid[])
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
        from public.assessments a
       where a.rater_id = p_rater_id
         and a.ratee_id = p_rater_id
         and a.is_self
    ) as self_done,
    coalesce(
      (select array_agg(a.ratee_id)
         from public.assessments a
        where a.rater_id = p_rater_id
          and a.ratee_id <> p_rater_id),
      '{}'::uuid[]
    ) as rated_ids;
$$;

-- Uma avaliação específica do jogador, pra edição.
-- Sem linha = resultado vazio (data = [] no front).
create or replace function public.get_my_assessment(p_rater_id uuid, p_ratee_id uuid)
returns table (scores jsonb, is_self boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select a.scores, a.is_self
    from public.assessments a
   where a.rater_id = p_rater_id
     and a.ratee_id = p_ratee_id;
$$;

-- Salva (cria ou atualiza) UMA avaliação. Única porta de escrita do jogador.
-- Valida tudo antes: identidades, coerência do is_self, formato das notas,
-- e se os dois jogadores existem e estão ativos.
create or replace function public.save_my_assessment(
  p_rater_id uuid,
  p_ratee_id uuid,
  p_scores   jsonb,
  p_is_self  boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_rater_id is null or p_ratee_id is null or p_is_self is null then
    raise exception 'rater_id, ratee_id e is_self são obrigatórios';
  end if;

  -- auto-avaliação é exatamente rater = ratee; avaliar coleguinha é rater <> ratee
  if p_is_self <> (p_rater_id = p_ratee_id) then
    raise exception 'is_self inconsistente: auto-avaliação exige rater_id = ratee_id (e só ela)';
  end if;

  if p_scores is null or jsonb_typeof(p_scores) <> 'object' then
    raise exception 'scores precisa ser um objeto JSON';
  end if;

  if exists (
    select 1 from jsonb_each(p_scores) where jsonb_typeof(value) <> 'number'
  ) then
    raise exception 'scores só aceita valores numéricos';
  end if;

  if not exists (select 1 from public.players where id = p_rater_id and active) then
    raise exception 'jogador avaliador não encontrado ou inativo';
  end if;

  if not exists (select 1 from public.players where id = p_ratee_id and active) then
    raise exception 'jogador avaliado não encontrado ou inativo';
  end if;

  insert into public.assessments (rater_id, ratee_id, scores, is_self)
  values (p_rater_id, p_ratee_id, p_scores, p_is_self)
  on conflict (rater_id, ratee_id) do update
    set scores     = excluded.scores,
        updated_at = now();
end;
$$;

-- ============================================
-- 3. Permissão de execução
-- ============================================
grant execute on function public.get_my_progress(uuid)                          to anon, authenticated;
grant execute on function public.get_my_assessment(uuid, uuid)                  to anon, authenticated;
grant execute on function public.save_my_assessment(uuid, uuid, jsonb, boolean) to anon, authenticated;

-- ============================================
-- Conferência rápida (opcional, no SQL Editor):
--   select policyname, cmd from pg_policies where tablename = 'assessments';
--     → esperado: assessments_select_admin (SELECT) e assessments_delete_admin (DELETE)
--   select * from public.get_my_progress('<uuid de um jogador>');
--   select * from public.get_my_assessment('<uuid rater>', '<uuid ratee>');
--   select public.save_my_assessment('<uuid>', '<uuid>', '{"passe": 7}'::jsonb, false);
-- ============================================
