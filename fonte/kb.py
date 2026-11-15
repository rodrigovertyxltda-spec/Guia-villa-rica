import json,re
S='/tmp/claude-0/-home-user/7b5bfe2a-c8d6-58bd-9011-9bfeed4ceb67/scratchpad/guia/site/data.json'
D=json.load(open(S));X=json.load(open('/tmp/claude-0/-home-user/7b5bfe2a-c8d6-58bd-9011-9bfeed4ceb67/scratchpad/kb/notas.json'))
FORA=re.compile(r'(?i)usu[aá]rio|voc[eê]\b|or[cç]amento|cotam|cotar|compra do cliente|compram|escava[cç][aã]o|exig[eê]ncia|licen[cç]|alvar[aá]|outorg|\bART\b|aprova[cç]|R\$|C = confirmado|^Base:|^Medidas em|estudo antigo|o estudo|como voc|pediu|equipe pr[oó]pria|pre[cç]o|custo|valor')
ob={}
for n,ks in D['obraDocs'].items():
    for k in ks: ob.setdefault(k,[]).append(n)
kb={}
for x in X:
    k=x['c'].lower()
    if k not in D['docs']: continue
    for t in x['n']:
        t=re.sub(r'\s+',' ',t).strip()
        if FORA.search(t) or len(t)<45: continue
        t=re.sub(r'(?<=\w)- (?=\w)','',t)  # hifenização quebrada
        e=kb.setdefault(t,[t,[],[]])
        if x['c'] not in e[1]: e[1].append(x['c'])
        for n in ob.get(k,[]):
            if n not in e[2]: e[2].append(n)
D['kb']=list(kb.values())
json.dump(D,open(S,'w'),ensure_ascii=False,separators=(',',':'))
print(len(D['kb']),sum(len(e[0]) for e in D['kb']))
