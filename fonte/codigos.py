# Gera/mantém códigos fixos VR-OO-PP-NNNN e grava no data.json (item[4])
import json,os,csv
S=os.path.dirname(os.path.abspath(__file__));P='/mnt/project-files/guia-virtual/codigos/'
os.makedirs(P,exist_ok=True)
SIG={'ferragem-aco-e-telas':'FE','estrutura-metalica':'EM','telhado':'TE','fechamento-e-fachada':'FF','fundacao':'FU','obra-civil':'OC','alvenaria':'AV',
'pisos-e-revestimentos':'PR','forro':'FO','esquadrias':'SQ','pintura':'PT','impermeabilizacao':'IM','bancadas':'BA','loucas-e-metais':'LM',
'hidraulica-agua-fria':'HF','hidraulica-agua-quente':'HA','hidraulica-esgoto-e-ventilacao':'HE','hidraulica-redes-e-drenagem':'HD','hidraulica-equipamentos':'HM',
'eletrica-quadros-e-protecao':'EQ','eletrica-cabos-e-eletrodutos':'EC','eletrica-caixas-e-acessorios':'EA','eletrica-iluminacao':'EI','eletrica-spda-e-aterramento':'ER',
'piscina-obra-civil':'PC','piscina-equipamentos-e-casa-de-maquinas':'PM','esportes':'EP','alambrado':'AL','urbanizacao':'UR'}
mp=P+'codigos-itens.json'
M=json.load(open(mp)) if os.path.exists(mp) else {"sig":{},"cod":{}}
for k,v in SIG.items(): M["sig"].setdefault(k,v)
D=json.load(open(S+'/site/data.json'))
usados=set(M["cod"].values());nxt={}
for c in usados:
    a=c.rsplit('-',1);nxt[a[0]]=max(nxt.get(a[0],0),int(a[1]))
rows=[];vist={};run=set();nomes={o[0]:o[1] for o in D['obras']}
for n,ps in D['mat'].items():
    for p in ps:
        sg=M["sig"].get(p['s'])
        if not sg: raise SystemExit('sem sigla: '+p['s'])
        for g in p['g']:
            for it in g[1]:
                key=f"{n}|{p['s']}|{g[0]}|{it[0]}|{it[1]}";vist[key]=vist.get(key,0)+1
                if vist[key]>1: key+=f"|{vist[key]}"
                pre=it[4] if len(it)>4 and isinstance(it[4],str) and it[4].startswith('VR-') and it[4] not in run else None
                if pre: M["cod"][key]=pre
                elif key not in M["cod"] or M["cod"][key] in run:
                    base=f"VR-{n}-{sg}";nxt[base]=nxt.get(base,0)+1;M["cod"][key]=f"{base}-{nxt[base]:04d}"
                c=M["cod"][key];run.add(c)
                if len(it)<5: it.append(c)
                else: it[4]=c
                rows.append([c,n,nomes[n],p['p'],g[0],it[0],it[1],it[2],(it[5] if len(it)>5 else '')])
D['sig']={v:k for k,v in M["sig"].items()}
D['sigNome']={}
for n,ps in D['mat'].items():
    for p in ps: D['sigNome'][M["sig"][p['s']]]=p['p']
json.dump(D,open(S+'/site/data.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(M,open(mp,'w'),ensure_ascii=False)
with open(P+'codigos-itens-villa-rica.csv','w',newline='',encoding='utf-8-sig') as f:
    w=csv.writer(f,delimiter=';');w.writerow(['Código','Obra','Nome da obra','Parte (destinação)','Grupo','Descrição','Unid.','Quant. da lista','Obs.']);w.writerows(rows)
print(len(rows),'itens',len(set(r[0] for r in rows)),'códigos únicos')
