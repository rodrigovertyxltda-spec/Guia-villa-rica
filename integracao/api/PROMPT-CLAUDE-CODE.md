# Tarefa: backend de sincronização do Guia de Obra Villa Rica

Você vai implementar o servidor (API HTTPS) que o app "Guia de Obra Villa Rica" já chama. O app está pronto e publicado; NÃO altere o app. Implemente o backend exatamente no contrato abaixo, na stack do nosso sistema, e entregue testado.

## Contexto
- App: PWA em HTML/JS puro, funciona offline, publicado em https://rodrigovertyxltda-spec.github.io/Guia-villa-rica/
- Repositório do app: github.com/rodrigovertyxltda-spec/Guia-villa-rica. A camada de sincronização está em `api.js` (funções `enviar`, `receber`, `sincronizar`, `numero`, `testar`). Leia esse arquivo se precisar confirmar algum detalhe.
- O app guarda tudo no aparelho (IndexedDB) e marca cada registro como pendente. Quando tem endereço de API configurado, sincroniza a cada 60 s, quando a internet volta, 3 s após abrir e logo após cada gravação.
- Usos: pedidos de cotação, orçamentos de fornecedor, ordens de compra (com liberação), produtos e fornecedores cadastrados, baixa de material por nota fiscal, fotos das obras, denúncias, troca de pranchas de projeto e histórico.

## Contrato (obrigatório, igual ao que o app chama)
Base: qualquer URL HTTPS (o app remove a barra final). Toda chamada leva `Authorization: Bearer <token>`. Token errado ou ausente = 401.
CORS: permitir origem `https://rodrigovertyxltda-spec.github.io`, cabeçalhos `Authorization, Content-Type`, métodos `GET, POST, OPTIONS`; responder o preflight `OPTIONS` com 204.

1. `GET /status` → 200 `{"ok":true}`. O app só olha o código HTTP.

2. `POST /arquivos` (multipart/form-data, campos `id` e `arquivo`; o nome do arquivo = id) → 200 `{"id":"<id>","url":"<url pública ou assinada para baixar>"}`.
   - Guardar o binário (fotos JPG/PNG, PDF de NF, PDF/foto de orçamento, PDF/DWG/DXF de prancha). Tamanho de prancha pode passar de 20 MB.
   - O app grava a `url` no campo `_urlServ` do registro e envia o registro logo depois. Outros aparelhos abrem o arquivo por essa url (com `GET` simples, sem cabeçalho de autorização: use url assinada ou rota pública com id não adivinhável).

3. `POST /registros` JSON:
   `{"dispositivo":"d_xxx","registros":[{"colecao":"cotacoes","id":"c_xxx","dados":{...}}]}` (lotes de até 200)
   → qualquer 2xx, ex. `{"ok":["c_xxx"]}`.
   - Chave única = `colecao` + "/" + `id`. Reenvio da mesma chave = substituir `dados` inteiros (upsert).
   - Gravar junto `dispositivo` e `atualizado` (hora do servidor, ISO 8601 UTC com milissegundos).
   - `colecao` pode ter subcaminho: `denuncias/<dispositivo>`. Trate como texto.
   - Não valide rigidamente o conteúdo de `dados` (guarde o JSON como veio); o app pode acrescentar campos.

4. `GET /registros?desde=<ISO>` → 200 `{"registros":[{"colecao","id","dados","atualizado"}],"agora":"<ISO>"}`.
   - Devolver tudo com `atualizado > desde` (sem `desde` = tudo), ordenado por `atualizado`.
   - `agora` = hora do servidor no momento da consulta; o app manda de volta na próxima vez. Garanta que um registro gravado durante a consulta não se perca (use `agora` capturado ANTES da consulta, ou `>=` com folga).
   - Pode devolver os registros do próprio aparelho que enviou (o app ignora o que ainda está pendente localmente).

5. `POST /sequencia/{tipo}` com tipo `ocs` ou `cotacoes` → 200 `{"num":"DDMMAA-NN"}`.
   - DDMMAA = data de hoje no fuso America/Sao_Paulo; NN = sequência CONTÍNUA por tipo (não zera por dia), 2 dígitos no mínimo.
   - Ordens de compra começam depois da OC 121126-01, então a primeira chamada de `ocs` devolve `...-02`. Cotações começam em `-01`.
   - Tem que ser atômico (transação/lock): dois aparelhos nunca recebem o mesmo número.
   - Se falhar, o app numera sozinho no mesmo formato; não há outro efeito.

## Coleções e campos principais (dados vêm do app, guarde como JSON)
- `cotacoes`: num, titulo, destino, prazo, agr, linhas[{d, u, r:[{c, k, o, q}]}], nome, em
- `orcamentos`: cot, cotNum, forn{nome,cnpj,end,cidade,ac,email,cliente}, prop, data, asset, pag{forma,parc,venc}, frete, obs, precos[{pu,cf,icms,ipi}], nome, em
- `ocs`: status ("pendente" | "liberada"), num, cot, cotNum, orc, forn, titulo, destino, itens[{d,u,q,pu,icms,ipi,cf,tot,r}], total, pag, frete, obsImp, libNome, libEm, nome, em
- `produtos`: cod (VR-OO-PP-9001 em diante), d, u, q, o, sg, nome, em
- `fornecedores`: nome, cnpj, end, cidade, ac, email, cliente, em
- `baixas`: obra, parte, itens[chaves], nf, oc, asset, nome, em
- `fotos`: obra, asset, nome, em
- `troca`: doc, acao, asset, cod, titulo, obra, nome, papel, em
- `historico`: acao, cod, titulo, obra, nome, papel, em
- `denuncias/<dispositivo>`: itens[...] (com asset de foto)
- Campos comuns: `asset` (id do arquivo enviado em /arquivos), `_urlServ` (url devolvida), `nome`, `em`.
- Código de item: `VR-OO-PP-NNNN` (OO obra 00–20, PP sigla da parte, NNNN sequência). Tabela no CSV anexo.

## Regras de negócio no servidor
- Ordem de compra nasce `pendente`. Hoje a senha de liberação é conferida no aparelho. No servidor: aceitar a mudança para `liberada` só de token/perfil autorizado a liberar (se o sistema tiver perfis; senão, registre quem liberou com `libNome`/`libEm` e o `dispositivo`).
- Produtos cadastrados: recusar (409) um `cod` que já exista em outro registro de `produtos`.
- Nunca guardar nem pedir senha do app: o app não manda senhas.
- Guardar log de cada gravação (colecao, id, dispositivo, hora) para auditoria.

## Migração: o banco do sistema passa a ser a fonte de tudo
O usuário quer que o sistema guarde TODO o banco do guia e que nada dependa do Google Drive dele. Hoje o app NÃO lê nada do Drive: tudo é servido pelo GitHub Pages do próprio app. Então a migração sai de lá:

| O que | Onde está hoje (URL base https://rodrigovertyxltda-spec.github.io/Guia-villa-rica/) |
|---|---|
| Obras, pranchas, listas de compra (só produto) e de execução, códigos VR, cronograma, resumos, base de conhecimento (`kb`) e textos de método (`guias`) | `data.json` |
| Páginas das pranchas (imagens) | `p/{chave}-{página}.webp` (chave e nº de páginas em `data.json > docs`) |
| Fotos e imagens 3D das obras | `f/*.jpg` (lista em `data.json > fotos`) |
| PDFs por obra e CAD por disciplina para download | `dl/{id}.bin` + índice `dl/dl.json` (CIFRADOS) |
| Financeiro (orçamento e cronograma financeiro) | `fin.enc.json` (CIFRADO) |
| Dados da empresa para cotação/OC, fornecedores base, sequência | `cmp.enc.json` (CIFRADO) |
| O que cada aparelho já criou (cotações, OCs, fotos, denúncias, trocas, baixas) | no IndexedDB de cada aparelho, marcado como pendente: sobe sozinho na 1ª sincronização com o servidor |

Passos:
1. Criar as tabelas (`schema.sql` no pacote, PostgreSQL; adapte se a stack for outra).
2. Rodar `python3 importar_guia.py import/` (no pacote): baixa tudo do GitHub Pages e gera um JSON por tabela + a pasta `import/arquivos/` com os binários (~180 MB). Importe os JSON nas tabelas e os binários no armazenamento de arquivos do sistema.
3. Expor para o app (para o app deixar de usar o `data.json` fixo numa próxima versão):
   - `GET /dados` → o mesmo formato do `data.json` atual, montado a partir das tabelas, com `versao` (data/hora da última alteração). Formato do item: `[descricao, unidade, quantidade_texto_ptBR, "M"|"E", codigo, nota, chapa]`.
   - `GET /arquivos/p/{chave}-{n}.webp`, `/arquivos/f/...`, `/arquivos/dl/{id}.bin`, `/cofres/fin.enc.json`, `/cofres/cmp.enc.json`, `/cofres/dl.json` servindo os mesmos bytes.
   O app atual continua funcionando igual; a troca do app para ler `GET /dados` é feita do nosso lado depois que essas rotas existirem.
4. Os arquivos cifrados (financeiro, dados de compras e downloads) são guardados EXATAMENTE como estão (AES-GCM, chave derivada da senha com PBKDF2 no aparelho). O servidor não recebe senha e não consegue abrir: isso é de propósito, para não expor valores. Se no futuro o sistema quiser o financeiro em tabelas, o responsável (perfil master) exporta pelo app depois de entrar com a senha; não tente quebrar nem pedir as senhas.
5. Itens da lista: `codigo` é único e fixo; produtos novos cadastrados no app vêm pela coleção `produtos` (código 9001+).

## Opcional (não chamado pelo app ainda)
`POST /perguntar` `{"pergunta","obra","perfil"}` → `{"texto","fontes":[...],"link"}`: IA que responde só com o conteúdo do guia (listas, pranchas, memoriais, cronograma), texto curto e natural, sem preço para quem não tem acesso ao financeiro; quando não estiver no projeto, dizer que não está definido. Deixe só a rota preparada se houver tempo.

## Critérios de aceite
1. `GET /status` com token certo = 200; sem token = 401; preflight OPTIONS = 204 com os cabeçalhos CORS.
2. Envio de 2 registros e depois `GET /registros` sem `desde` devolve os 2 com `atualizado`; com `desde=<agora anterior>` devolve só o que mudou depois.
3. Reenvio da mesma `colecao/id` substitui os dados e aparece de novo no próximo `GET` com `desde`.
4. `POST /arquivos` devolve `url` que baixa o mesmo binário sem cabeçalho de autorização.
5. 50 chamadas simultâneas a `/sequencia/ocs` devolvem 50 números diferentes e seguidos; a primeira chamada da história devolve `-02`.
6. Importação feita: contagens do item anterior batem no banco e `GET /dados` devolve o mesmo conteúdo do `data.json` publicado (compare chave por chave).
7. Teste ponta a ponta com o app (abaixo) passando.

## Como testar com o app
1. Suba o servidor em HTTPS (pode ser túnel tipo ngrok/cloudflared para teste).
2. Abra o app no celular ou no Chrome: https://rodrigovertyxltda-spec.github.io/Guia-villa-rica/
3. Área financeira > senha master (o responsável da obra digita) > Configurações > "Endereço da API" e "Chave de acesso (token)" > Salvar > Testar conexão (tem que dar 200) > Sincronizar agora.
4. Em dois aparelhos (ou duas janelas anônimas) configurados no mesmo servidor: no 1º, Compras da obra > Cotação e ordem de compra > criar um pedido de cotação; no 2º, em até 60 s a cotação aparece, com número vindo do servidor.
5. Anexar um orçamento (foto/PDF) e gerar a OC: no 2º aparelho ela aparece como pendente; liberar e conferir `status:"liberada"` no banco.

## Arquivos de apoio (no pacote)
- `openapi.yaml`: especificação formal (OpenAPI 3.0.3) com esquemas e exemplos.
- `exemplos/*.json`: requisições e respostas de exemplo.
- `mock_api.py`: servidor de referência em Python (memória, ~40 linhas), usado nos nossos testes; mostra o comportamento esperado (token de teste `teste`, porta 8768).
- `api.js`: cópia da camada de sincronização do app (referência, não alterar).
- `codigos-itens-villa-rica.csv`: tabela de códigos VR dos itens.
- `schema.sql`: tabelas sugeridas (sincronização + base do guia).
- `importar_guia.py`: baixa tudo do app publicado e gera os arquivos de importação (testado: 21 obras, 122 pranchas, 238 páginas, 2.422 itens, 576 linhas de cronograma, 350 anotações, 13 textos, 32 downloads).
- `INTEGRACAO-sistema.md/.pdf`: documento geral (dados da obra, arquivos cifrados, perfis e próximos passos).

Entregue: código do backend, instruções de deploy, URL de produção e o token para configurar no app (o token é passado por canal seguro, não por e-mail aberto).
