"""Baixa tudo o que o app publicado usa e gera arquivos prontos para importar no banco.
Uso: python3 importar_guia.py [pasta_saida]
Fonte: o próprio GitHub Pages do app (não depende do Google Drive de ninguém)."""
import json, os, sys, urllib.request
BASE = os.environ.get('GUIA_URL', 'https://rodrigovertyxltda-spec.github.io/Guia-villa-rica/')
OUT = sys.argv[1] if len(sys.argv) > 1 else 'import'
os.makedirs(OUT + '/arquivos', exist_ok=True)
def get(p):
    with urllib.request.urlopen(BASE + p) as r: return r.read()
def salva(p):
    dst = os.path.join(OUT, 'arquivos', p); os.makedirs(os.path.dirname(dst), exist_ok=True)
    if not os.path.exists(dst): open(dst, 'wb').write(get(p))
    return 'arquivos/' + p
D = json.loads(get('data.json'))
T = {k: [] for k in ['obras','pranchas','obra_pranchas','prancha_paginas','itens','cronograma','obra_frentes','resumo_obra','conhecimento','guias','fotos_projeto','downloads','cofres']}
for o in D['obras']: T['obras'].append(dict(num=o[0], nome=o[1], descricao=o[2]))
for k, d in D['docs'].items():
    T['pranchas'].append(dict(chave=k, codigo=d['c'], titulo=d['t'], paginas=d['n'], disciplina=d['d']))
    for i in range(1, d['n'] + 1):
        try: T['prancha_paginas'].append(dict(prancha=k, pagina=i, arquivo=salva(f'p/{k}-{i}.webp')))
        except Exception as e: print('sem página', k, i, e)
for o, ks in D['obraDocs'].items():
    for k in ks: T['obra_pranchas'].append(dict(obra=o, prancha=k))
def br(q):
    try: return float(str(q).replace('.', '').replace(',', '.'))
    except: return None
for tipo, chave in (('compra', 'mat'), ('execucao', 'exe')):
    for o, ps in D.get(chave, {}).items():
        n = 0
        for p in ps:
            for g, its in p['g']:
                for it in its:
                    n += 1; it = list(it) + [None] * (7 - len(it))
                    T['itens'].append(dict(codigo=it[4], tipo=tipo, obra=o, parte=p['p'], parte_sigla=p['s'], familia=p['f'], grupo=g,
                        descricao=it[0], unidade=it[1], quantidade=br(it[2]), status_qtd=it[3], nota=it[5] or '', chapa=it[6], ordem=n))
for c in D['crono']:
    for i, a in enumerate(c[1]): T['cronograma'].append(dict(frente=c[0], mes_idx=i, mes=D['meses'][i], ativo=bool(a)))
for o, fs in D['linha'].items():
    for f in fs: T['obra_frentes'].append(dict(obra=o, frente=f))
for o, rs in D['resumo'].items():
    for i, r in enumerate(rs): T['resumo_obra'].append(dict(obra=o, ordem=i, texto=r))
for e in D.get('kb', []): T['conhecimento'].append(dict(texto=e[0], pranchas=e[1], obras=e[2]))
for g in D.get('guias', []): T['guias'].append(dict(titulo=g['t'], obra=g['o'], palavras=g['k'], texto=g['x'], fonte=g['r']))
for o, fs in (D['fotos'].items() if isinstance(D['fotos'], dict) else []):
    for f in fs: T['fotos_projeto'].append(dict(obra=o, arquivo=salva(f[0]), legenda=f[1]))
dl = json.loads(get('dl/dl.json'))
for f in dl['f']:
    T['downloads'].append(dict(id=f['id'], titulo=f['t'], nome_arquivo=f['n'], mime=f['m'], grupo=f['g'], obra=f.get('o'), tamanho=f.get('sz'), arquivo_cifrado=salva('dl/' + f['id'] + '.bin')))
for nome in ('fin.enc.json', 'cmp.enc.json', 'dl/dl.json'):
    T['cofres'].append(dict(nome=nome, conteudo=json.loads(get(nome)), nota='cifrado AES-GCM; guardar como está; só abre com a senha no app'))
for k, v in T.items():
    json.dump(v, open(f'{OUT}/{k}.json', 'w'), ensure_ascii=False)
    print(f'{k}: {len(v)}')
json.dump({k: v for k, v in D.items() if k in ('sig', 'sigNome', 'div', 'pac', 'des', 'planta', 'meses')}, open(f'{OUT}/outros.json', 'w'), ensure_ascii=False)
print('ok ->', OUT)
