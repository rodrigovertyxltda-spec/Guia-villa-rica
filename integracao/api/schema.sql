-- Esquema sugerido (PostgreSQL). Adapte à stack do sistema.
-- 1) Sincronização do app (contrato /registros)
create table registros (
  colecao     text not null,
  id          text not null,
  dados       jsonb not null,
  dispositivo text,
  atualizado  timestamptz not null default now(),
  primary key (colecao, id)
);
create index registros_atualizado on registros (atualizado);
create table registros_log (            -- auditoria: cada gravação
  n bigserial primary key, colecao text, id text, dispositivo text, dados jsonb, em timestamptz default now()
);
create table sequencias (tipo text primary key, ultimo int not null);
insert into sequencias values ('ocs', 1), ('cotacoes', 0);   -- OC continua da 121126-01
create table arquivos (id text primary key, nome text, mime text, tamanho bigint, caminho text, criado timestamptz default now());

-- 2) Base do guia (migrada do data.json; hoje fixa no app)
create table obras (num text primary key, nome text, descricao text);
create table pranchas (chave text primary key, codigo text, titulo text, paginas int, disciplina text);
create table obra_pranchas (obra text references obras, prancha text references pranchas, primary key (obra, prancha));
create table prancha_paginas (prancha text references pranchas, pagina int, arquivo text, primary key (prancha, pagina)); -- p/{chave}-{n}.webp
create table itens (                      -- lista de compras (só produto) e execução
  codigo text,                            -- VR-OO-PP-NNNN (execução pode vir sem código)
  tipo text not null check (tipo in ('compra','execucao')),
  obra text references obras, parte text, parte_sigla text, familia text, grupo text,
  descricao text, unidade text, quantidade numeric, status_qtd char(1),  -- M medida / E estimada
  nota text, chapa jsonb,                 -- item[5] e item[6]
  ordem int
);
create unique index itens_codigo on itens (codigo) where codigo is not null;
create table cronograma (frente text, mes_idx int, mes text, ativo boolean, primary key (frente, mes_idx));
create table obra_frentes (obra text, frente text, primary key (obra, frente));
create table resumo_obra (obra text, ordem int, texto text);
create table conhecimento (n serial primary key, texto text, pranchas text[], obras text[]);    -- data.json kb
create table guias (n serial primary key, titulo text, obra text, palavras text, texto text, fonte text);
create table fotos_projeto (obra text, arquivo text, legenda text);   -- data.json fotos (f/*.jpg)
create table downloads (id text primary key, titulo text, nome_arquivo text, mime text, grupo text, obra text, tamanho bigint, arquivo_cifrado text); -- dl/*.bin
create table cofres (nome text primary key, conteudo jsonb, nota text);  -- fin.enc.json, cmp.enc.json, dl/dl.json (cifrados, guardar como estão)
