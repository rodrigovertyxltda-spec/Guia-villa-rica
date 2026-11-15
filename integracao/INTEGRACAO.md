# Guia de Obra – integração com o sistema (para o programador do Luiz Felipe)

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
| `baixas` | Baixa por nota fiscal | obra, parte, itens[chaves], nf, oc, asset, nome, em |
| `fotos` | Fotos por obra | obra, asset, nome, em |
| `denuncias/{aparelho}` | Denúncias | itens[...] com foto (asset) |
| `troca` | Troca de arquivo de projeto | doc, acao, asset, nome, papel, em |
| `historico` | Quem fez o quê | acao, cod, titulo, obra, nome, papel, em |

- `c` = código do item **VR-OO-PP-NNNN** (OO obra 00–20, PP parte/destinação, NNNN sequência). Tabela completa: `codigos-itens-villa-rica.csv` (2.409 itens). Código fixo.
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
