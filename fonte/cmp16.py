# Aplica a lista de compras v6 (16/11) do gerador /mnt/project-files/cotacao/gerador/compras.py ao data.json do guia
import sys,json,os,re,csv
HERE=os.getcwd()
sys.dont_write_bytecode=True
sys.path.insert(0,'/mnt/project-files/cotacao/gerador');os.chdir('/mnt/project-files/cotacao/gerador')
import compras as C
os.chdir(HERE)
S='site/data.json';D=json.load(open(S))
loc={}
for o,ps in D['mat'].items():
    for p in ps:
        for g in p['g']:
            for it in g[1]: loc[it[4]]=(g[1],it)
def nxt(pref):
    n=[int(c[-4:]) for c in loc if c.startswith(pref) and int(c[-4:])<9000]
    return pref+'%04d'%(max(n)+1)
MK='● atualizado 16/11'
def nota(o,old):
    o=(o or '').strip()
    base=o if o else (old or '')
    base=re.sub(r'\s*·?\s*● atualizado 16/11','',base).strip(' ·')
    return (base+' · '+MK) if base else MK
novos=[];prev=None;st={'set':0,'drop':0,'add':0}
for r in C.I:
    c=r['Código']
    if c!='(novo)':
        prev=c
        if c not in loc: continue
        lst,it=loc[c]
        if r.get('drop'):
            it.append('__DROP__');st['drop']+=1;continue
        if r['novo']:
            it[0]=r['Descrição'];it[2]=C.br(r['q']) if r['q'] is not None else it[2];it[3]='M'
            it[5]=nota(r['Obs.'],it[5] if len(it)>5 else '');st['set']+=1
        elif it[0]!=r['Descrição']:
            it[0]=r['Descrição'];it[5]=nota('',it[5] if len(it)>5 else '');st['set']+=1
    elif not r.get('drop'):
        lst,a=loc[prev]
        pref=prev[:-4];code=nxt(pref)
        new=[r['Descrição'],r['Unid.'],C.br(r['q']),'M',code,nota(r['Obs.'],'')]
        lst.insert(lst.index(a)+1,new);loc[code]=(lst,new);prev=code;st['add']+=1
        novos.append([code,r['Obra'],r['Nome da obra'],r['Parte (destinação)'],r['Grupo'],r['Descrição'],r['Unid.'],C.br(r['q']),r['Obs.']])
for o,ps in D['mat'].items():
    for p in ps:
        for g in p['g']: g[1][:]=[i for i in g[1] if i[-1]!='__DROP__']
        p['g']=[g for g in p['g'] if g[1]]
    D['mat'][o]=[p for p in ps if p['g']]
# nomes
for p in D['mat'].get('10',[]):
    for g in p['g']: g[0]=g[0].replace('Quadras nas 3 lajes','3 pisos das quadras de peteca')
json.dump(D,open(S,'w'),ensure_ascii=False,separators=(',',':'))
w=csv.writer(open('codigos-novos-16-11.csv','w',encoding='utf-8-sig'),delimiter=';')
w.writerow(['Código','Obra','Nome da obra','Parte (destinação)','Grupo','Descrição','Unid.','Quant. da lista','Obs.']);w.writerows(novos)
print(st,sum(len(g[1]) for ps in D['mat'].values() for p in ps for g in p['g']))
# ---------- ferragem: quiosques sem lastro (ARQ-19 só acabamento) ----------
D=json.load(open(S))
for p in D['mat']['13']:
    for g in p['g']: g[1][:]=[i for i in g[1] if i[4]!='VR-13-FE-0001']
    p['g']=[g for g in p['g'] if g[1]]
D['mat']['13']=[p for p in D['mat']['13'] if p['g']]
# ---------- alambrados: adendo B regerado 16/11 ----------
R=json.load(open('/mnt/project-files/aco-construcao/adendos/insumos.json'))
A={a['cod']:a for a in R['alam']}
MAP={('12','Campo oficial'):'12',('11','Beach tennis (4 quadras)'):'8',('11','Futebol 7 (2 campos)'):'11',('10','3 pisos das quadras de peteca'):'18'}
allc={i[4] for ps in D['mat'].values() for p in ps for g in p['g'] for i in g[1]}
def base(d): return re.split(r' – |\(',d)[0].strip()
def br(x): return C.br(x)
for o,ps in D['mat'].items():
    for p in ps:
        if p['p']!='Alambrado': continue
        for g in p['g']:
            a=A[MAP[(o,g[0])]];old=list(g[1]);used=set();new=[]
            pref=old[0][4][:-4]
            for d,un,q,kg,me in a['linhas']:
                m=next((i for i in old if i[4] not in used and base(i[0])[:25]==base(d)[:25]),None)
                if m: code=m[4]
                else:
                    n=[int(c[-4:]) for c in allc if c.startswith(pref) and int(c[-4:])<9000];code=pref+'%04d'%(max(n)+1)
                    novos.append([code,o,'',p['p'],g[0],d,un,br(q),''])
                used.add(code);allc.add(code)
                nt=(f'≈ {br(kg)} kg' if kg else '')
                new.append([d,un,br(q),me,code,(nt+' · ' if nt else '')+MK])
            g[1][:]=new
            if o=='10': g[0]='OPCIONAL – alambrado em volta dos 3 pisos de peteca (fora do total)'
            print(o,g[0][:30],len(old),'->',len(new),'saíram',[i[4] for i in old if i[4] not in used])
json.dump(D,open(S,'w'),ensure_ascii=False,separators=(',',':'))
w=csv.writer(open('codigos-novos-16-11.csv','w',encoding='utf-8-sig'),delimiter=';')
w.writerow(['Código','Obra','Nome da obra','Parte (destinação)','Grupo','Descrição','Unid.','Quant. da lista','Obs.']);w.writerows(novos)
print('itens',sum(len(g[1]) for ps in D['mat'].values() for p in ps for g in p['g']),'novos',len(novos))
