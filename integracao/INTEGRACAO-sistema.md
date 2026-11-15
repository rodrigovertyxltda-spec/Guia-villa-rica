# Guia de Obra – integração com o sistema (para o programador do Luiz Felipe)

_Atualizado em 15/11/2026, 16h. Inclui: Compras (cotação, orçamento, OC com liberação, produtos, fornecedores), lista só de produtos + aba Execução, chapas cortadas com desenho, download de projetos com senha, perfis de acesso e o assistente (onde ligar a IA)._

Aplicativo: https://rodrigovertyxltda-spec.github.io/Guia-villa-rica/ (PWA, HTML/JS puro, funciona offline).
Código: repositório rodrigovertyxltda-spec/Guia-villa-rica (pasta `fonte/`; camada de dados em `api.js`).

## Como ligar
1. Publicar a API em HTTPS com CORS liberado para `https://rodrigovertyxltda-spec.github.io` (cabeçalhos `Authorization, Content-Type`; métodos `GET, POST, OPTIONS`).
2. No app: Área financeira > entrar com senha master > Configurações > "Endereço da API" + "Chave de acesso (token)" > Salvar > Testar conexão > Sincronizar agora.
3. A partir daí o app sincroniza sozinho: a cada 60 s, quando a internet volta e logo depois de cada gravação.

## O que o app guarda hoje (IndexedDB, por aparelho)
Cada registro é um documento `colecao/id` com `_pend:true` até o servidor confirmar.

| Coleção | O que é | Campos principais |
|---|---|---|
| `cotacoes` | Pedido de cotação | num, titulo, destino, prazo, agr, linhas[{d,u,r:[{c,k,o,q}]}], nome, em |
| `orcamentos` | Orçamento do fornecedor anexado | cot, cotNum, forn{nome,cnpj,end,cidade,ac,email,cliente}, prop, data, asset, pag{forma,parc,venc}, frete, obs, precos[{pu,cf,icms,ipi}] (mesma ordem das linhas), nome, em |
| `ocs` | Ordem de compra | status ("pendente"/"liberada"), num, cot, cotNum, orc, forn, titulo, destino, itens[{d,u,q,pu,icms,ipi,cf,tot,r}], total, pag, libNome, libEm, nome, em |
| `produtos` | Produto cadastrado fora da lista | cod (VR-OO-PP-9001 em diante), d, u, q, o (obra), sg (parte), nome, em |
| `fornecedores` | Fornecedor cadastrado | nome, cnpj, end, cidade, ac, email, cliente, em |
| `baixas` | Baixa por nota fiscal | obra, parte, itens[chaves], nf, oc, asset, nome, em |
| `fotos` | Fotos por obra | obra, asset, nome, em |
| `denuncias/{aparelho}` | Denúncias | itens[...] com foto (asset) |
| `troca` | Troca de arquivo de projeto | doc, acao, asset, nome, papel, em |
| `historico` | Quem fez o quê | acao, cod, titulo, obra, nome, papel, em |

- `c` = código do item **VR-OO-PP-NNNN** (OO obra 00–20, PP parte/destinação, NNNN sequência). Tabela completa: `codigos-itens-villa-rica.csv` (2.238 itens após a revisão de 15/11; pasta `integracao/` do repositório). Código fixo. Produtos cadastrados no app usam NNNN a partir de 9001 (coleção `produtos`); com servidor, recomenda-se o servidor validar que o código não se repete.
- `k` = chave interna do item na lista (`obra|parte|grupo|item`); `o` = obra; `q` = quantidade.
- `asset` = id do arquivo (foto, PDF da NF, orçamento) guardado no aparelho.

## Contrato da API (o que o app chama)
Todas as chamadas levam `Authorization: Bearer {token}`.

| Chamada | Envia | Responde |
|---|---|---|
| `GET /status` | – | 200 `{ok:true}` |
| `POST /arquivos` | multipart: `id`, `arquivo` | `{id, url}` (o app grava a url em `_urlServ`) |
| `POST /registros` | JSON `{dispositivo, registros:[{colecao,id,dados}]}` (lotes de 200; reenvio do mesmo id = atualizar) | 2xx `{ok:[ids]}` |
| `GET /registros?desde=ISO` | – | `{registros:[{colecao,id,dados,atualizado}], agora:ISO}`; o app guarda `agora` e pede só o que mudou |
| `POST /sequencia/{cotacoes\|ocs}` | – | `{num:"DDMMAA-NN"}` número único e em sequência |

- Numeração: com servidor, o número da cotação e da OC vem de `/sequencia` (único para todos). Sem servidor ou sem internet, o app numera localmente no mesmo formato. A sequência de OC continua da OC 121126-01 (próxima = -02).
- Ordens pendentes: toda OC nasce `status:"pendente"`. Com o servidor, quem libera vê as pendentes de todos os aparelhos. A liberação grava `status:"liberada", libNome, libEm` e o PDF só fica disponível depois disso.
- Recomendado no servidor: validar a liberação (perfil/senha de liberação) e recusar `status:"liberada"` de quem não pode liberar; hoje a conferência da senha é feita no aparelho.
- Senhas não trafegam: o app só usa as senhas para abrir dados cifrados no próprio aparelho.

## Servidor de exemplo
`mock_api.py` (Python, ~40 linhas) implementa esse contrato em memória e foi usado nos testes: dois aparelhos diferentes, um cria a cotação, o outro recebe pela sincronização, numeração vindo do servidor.

## Dados da obra (`data.json`, hoje fixo no app)
Arquivo único carregado na abertura e guardado offline. Com o servidor, a ideia é servir o mesmo formato em `GET /dados` (com `versao`), para o app trocar sem nova publicação.

| Chave | O que é |
|---|---|
| `obras` | `[[num, nome, descrição]]`, 00 a 20 |
| `docs` | pranchas: `{chave: {c: código, t: título, n: páginas, d: disciplina}}` |
| `obraDocs` | `{obra: [chaves de docs]}` |
| `mat` | **Lista de compras (só produto)**: `{obra: [{p: parte, s: sigla-url, f: família, g: [[grupo, [item...]]]}]}` |
| `exe` | **Execução** (serviços, não entram em cotação): mesmo formato de `mat` |
| `crono`, `meses`, `linha` | cronograma: `[nome, [0/1 por mês], ...]`, 24 meses jan/27–dez/28; `linha[obra]` = frentes da obra |
| `resumo` | frases de resumo por obra |
| `sig`, `sigNome` | sigla da parte (FE, EM, TE...) ↔ nome da parte |
| `kb` | 350 anotações tiradas das pranchas: `[texto, [códigos de prancha], [obras]]` |
| `guias` | textos explicativos de método construtivo: `{t: título, o: obra, k: palavras-chave, x: texto, r: fonte}` |

**Item da lista** (array, posições fixas):
```json
["Chapa cortada ASTM A36 750 x 300 mm – esp. 45 mm – 4 furos Ø44 mm – base do pilar S-C1 W 460 x 74,0",
 "peça", "32", "M", "VR-01-EM-0010",
 "79,5 kg/peça · furação conforme EST-04",
 {"L":750,"S":300,"e":45,"n":4,"d":44,"f":[[60,50],[60,250],[690,50],[690,250]],"ref":"EST-04"}]
```
0 descrição comercial · 1 unidade de venda (barra 12 m, barra 6 m, peça, m², un, rolo, saco 25 kg...) · 2 quantidade (texto pt-BR) · 3 `M` medida / `E` estimada · 4 código VR · 5 nota pequena (peso por barra/peça, "a confirmar") · 6 **só chapas cortadas**: geometria para o desenho (mm; `f` = furos [x,y] a partir do canto inferior esquerdo, comprimento L na horizontal; `f:null` = posição dos furos a confirmar; `L:0` = medida a confirmar, sem desenho).

Regras da lista (não quebrar na integração): só produto; aço em barras de 12/6 m pelo kg/m Gerdau; chapa sempre cortada na medida; chumbador em unidade com comprimento total; telha em m² (largura útil 1 m), 0,65 mm, acabamento preta/galvalume/pré-pintada branca escolhido na cotação; steel deck com unidade de venda a confirmar. Scripts que geram a lista: `fonte/limpa.py`, `fix2.py`, `fix3.py`, `chapas.py`, `codigos.py` (mantém os códigos já dados), `kb.py`, `guias.py`, `pwa_build.py`.

## Pedido de cotação com desenho das chapas
O PDF da cotação (jsPDF no aparelho) acrescenta no final uma página "Desenho das chapas cortadas" com um quadro por chapa (contorno, cotas, furos, espessura, quantidade, código). Os dados vêm do item[6]. Se o servidor gerar PDFs, usar o mesmo item[6].

## Arquivos cifrados (nenhuma senha fica em texto)
| Arquivo | Conteúdo | Como abre |
|---|---|---|
| `fin.enc.json` | orçamento v3 e cronograma financeiro | AES-GCM, chave PBKDF2-SHA256 200 mil iterações sobre `login|senha`; 4 envelopes (2 master, 2 financeiro); a tela pede só a senha e tenta os 4 |
| `cmp.enc.json` | dados da empresa para OC/cotação, fornecedores, hash da senha de liberação, base das sequências | AES-GCM, PBKDF2 150 mil sobre a senha de Compras |
| `dl/*.enc` + `dl/lista.json` | PDFs por obra e CAD por disciplina para baixar | AES-GCM, chave do arquivo embrulhada por senha (engenheiro, arquiteto) |

Com o servidor, o ideal é trocar isso por login de verdade (usuário + perfil) e o servidor decidir o que cada um vê. Perfis hoje: **master**, **financeiro**, **compras**, **liberação de OC**, **download de projetos** (engenheiro/arquiteto), público (resto do guia, sem valores).

## Assistente da tela inicial (onde a IA se liga)
Hoje: botão de microfone (reconhecimento de voz do navegador, pt-BR) + resposta montada no aparelho, só com `mat`, `crono`, `docs`, `kb` e `guias` (sem internet para pensar, sem valores). Função `responder(pergunta)` em `fonte/app.html` devolve `{t: texto, l: detalhes[], h: link interno, hl: rótulo do link, ref: fonte}`.

Para ligar uma IA de verdade, contrato sugerido:
```
POST /perguntar   {"pergunta":"como vai ser feita a fundação do galpão da piscina","obra":"02","perfil":"publico"}
→ 200 {"texto":"A fundação do galpão ...","fontes":["EST-06","MC-02"],"link":"#doc-est-06"}
```
- O servidor responde **só** com o conteúdo do guia (data.json, textos das pranchas e memoriais), em texto curto e em tom de conversa de obra; quando não estiver no projeto, responde que não está definido.
- Nunca enviar preço/orçamento para perfil sem acesso ao financeiro.
- Se `/perguntar` falhar ou não houver internet, o app usa a resposta local (já pronto).

## Próximo passo (depois da integração): engenheiros mantendo o guia
Para o fim de dezembro, com o cronograma alinhado em janeiro: perfil **engenheiro** para trocar/anexar pranchas (já existe a coleção `troca`), editar quantidade e unidade dos itens, lançar o preço real depois da cotação e ajustar o cronograma, sempre com histórico (quem, quando, valor antigo e novo). Para isso `data.json` passa a vir do servidor (`GET /dados`) e as edições entram como registros (`colecao: "edicoes"`, `{tipo, alvo (código VR ou chave), campo, de, para, nome, em}`). Ainda não programado no app.
