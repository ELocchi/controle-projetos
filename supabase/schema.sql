-- Controle de Projetos · esquema do banco (Supabase / Postgres)
-- Rode o arquivo inteiro no SQL Editor do Supabase. Pode rodar de novo sem perder dados.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- quem entra na gestão
-- ---------------------------------------------------------------
create table if not exists admins (email text primary key);
insert into admins (email) values ('emanuel.locchi@dialogo.com.br') on conflict do nothing;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- ---------------------------------------------------------------
-- tabelas
-- ---------------------------------------------------------------
create table if not exists projetos (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null default 'novo projeto',
  objetivo       text not null default '',
  responsavel    text not null default '',
  prazo          date,
  status         text not null default 'planejamento'
                 check (status in ('planejamento','em andamento','pausado','testes','concluído')),
  plataforma_url text not null default '',
  publico        boolean not null default true,   -- aparece na lista do formulário de feedback
  notas          text not null default '',
  checklist      jsonb not null default '[]',
  etapas         jsonb not null default '{}',
  links          jsonb not null default '[]',
  docs           jsonb not null default '[]',
  origem         jsonb,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create sequence if not exists pedidos_seq;

create table if not exists pedidos (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique default ('DLG-' || lpad(nextval('pedidos_seq')::text, 4, '0')),
  token       uuid not null unique default gen_random_uuid(),   -- link secreto de acompanhamento
  tipo        text not null check (tipo in ('novo projeto','feedback de plataforma')),
  setor       text not null,
  nome        text not null,
  plataforma  text not null default '',
  projeto_id  uuid references projetos(id) on delete set null,
  titulo      text not null,
  descricao   text not null default '',
  precisa_ate date,
  criado_em   timestamptz not null default now(),
  -- andamento (o solicitante vê)
  status      text not null default 'recebido'
              check (status in ('recebido','em análise','aprovado','em desenvolvimento','entregue','recusado')),
  status_em   timestamptz not null default now(),
  hist        jsonb not null default '[]',
  msg         text not null default '',
  -- gestão (só você vê)
  diretoria   boolean not null default false,
  esforco     smallint check (esforco between 1 and 5),
  impacto     smallint check (impacto between 1 and 5),
  prazo       date,
  notas       text not null default ''
);

create table if not exists config (
  chave text primary key,
  valor jsonb not null
);

-- ---------------------------------------------------------------
-- acesso: só o gestor lê e grava as tabelas
-- ---------------------------------------------------------------
alter table admins   enable row level security;
alter table projetos enable row level security;
alter table pedidos  enable row level security;
alter table config   enable row level security;

revoke all on admins, projetos, pedidos, config from anon;

drop policy if exists gestor on projetos;
create policy gestor on projetos for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists gestor on pedidos;
create policy gestor on pedidos  for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists gestor on config;
create policy gestor on config   for all to authenticated using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------
-- formulário público (sem login): só estas três funções
-- ---------------------------------------------------------------

-- envia um pedido e devolve o protocolo e o token de acompanhamento
create or replace function enviar_pedido(
  p_tipo text, p_setor text, p_nome text, p_plataforma text, p_projeto_id uuid,
  p_titulo text, p_descricao text, p_precisa_ate date
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r pedidos;
begin
  if p_tipo not in ('novo projeto','feedback de plataforma') then
    raise exception 'tipo de pedido inválido';
  end if;
  if coalesce(trim(p_setor),'') = '' or coalesce(trim(p_nome),'') = '' or coalesce(trim(p_titulo),'') = '' then
    raise exception 'preencha setor, nome e título';
  end if;
  if (select count(*) from pedidos where criado_em > now() - interval '10 minutes') >= 30 then
    raise exception 'muitos envios agora. tente de novo em alguns minutos';
  end if;
  if p_projeto_id is not null and not exists (select 1 from projetos where id = p_projeto_id and publico) then
    p_projeto_id := null;
  end if;
  insert into pedidos (tipo, setor, nome, plataforma, projeto_id, titulo, descricao, precisa_ate, hist)
  values (p_tipo, left(trim(p_setor),60), left(trim(p_nome),60), left(coalesce(trim(p_plataforma),''),80),
          p_projeto_id, left(trim(p_titulo),140), left(coalesce(trim(p_descricao),''),1500), p_precisa_ate,
          jsonb_build_array(jsonb_build_object('s','recebido','em',(extract(epoch from now())*1000)::bigint)))
  returning * into r;
  return jsonb_build_object('codigo', r.codigo, 'token', r.token);
end $$;

-- devolve só os campos públicos dos pedidos cujos tokens a pessoa tem
create or replace function acompanhar(p_tokens uuid[]) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'token', token, 'codigo', codigo, 'titulo', titulo, 'tipo', tipo, 'setor', setor,
           'plataforma', plataforma, 'criado_em', criado_em, 'status', status, 'hist', hist, 'msg', msg)
         order by criado_em desc), '[]'::jsonb)
  from pedidos where token = any (p_tokens[1:50]);
$$;

-- lista de plataformas para o formulário de feedback
create or replace function catalogo() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'titulo', titulo) order by lower(titulo)), '[]'::jsonb)
  from projetos where publico;
$$;

-- depois de importar um backup, acerta o contador de protocolos
create or replace function ajustar_protocolo() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'sem permissão'; end if;
  perform setval('pedidos_seq', greatest(1, coalesce((select max(substring(codigo from 5)::int) from pedidos where codigo ~ '^DLG-[0-9]+$'), 1)));
end $$;

revoke execute on function enviar_pedido(text,text,text,text,uuid,text,text,date) from public;
revoke execute on function acompanhar(uuid[]) from public;
revoke execute on function catalogo() from public;
revoke execute on function ajustar_protocolo() from public;
grant execute on function enviar_pedido(text,text,text,text,uuid,text,text,date) to anon, authenticated;
grant execute on function acompanhar(uuid[]) to anon, authenticated;
grant execute on function catalogo() to anon, authenticated;
grant execute on function ajustar_protocolo() to authenticated;
grant execute on function is_admin() to authenticated;

-- ---------------------------------------------------------------
-- arquivos dos projetos (bucket privado, só o gestor)
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('docs', 'docs', false) on conflict (id) do nothing;

drop policy if exists "docs gestor" on storage.objects;
create policy "docs gestor" on storage.objects for all to authenticated
  using (bucket_id = 'docs' and public.is_admin())
  with check (bucket_id = 'docs' and public.is_admin());
