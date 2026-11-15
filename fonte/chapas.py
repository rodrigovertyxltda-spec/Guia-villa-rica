# Chapas cortadas e chumbadores na medida (R02 "Chapas e chumbadores" + detalhes EST-04/EST-09 R02)
import json,re,math,openpyxl
D=json.load(open('site/data.json'));REL=json.load(open('limpa_rel.json'))
wb=openpyxl.load_workbook('/mnt/project-files/estrutura-metalica/R02/estrutura-metalica-galpoes-villa-rica-R02.xlsx',read_only=True)
rows=[r for r in wb['Chapas e chumbadores'].iter_rows(values_only=True)][1:]
OB={'Sede':('01','Galpão principal'),'Sede bloco fundo':('01','Bloco de fundo'),'Quadra':('03',''),'Piscina':('02',''),'Academia':('04',''),
    'Arena':('14',''),'Vestiário campo':('12',''),'Serviços':('15',''),'Oficina':('16','Oficina'),'Apoio func.':('16','Oficina')}
def br(x): return f"{x:.1f}".replace('.',',').replace(',0','') if isinstance(x,float) else str(x)
# furação desenhada nas pranchas (mm, origem no canto inferior esquerdo, comprimento B na horizontal)
# (prancha, B, A, e): lista de furos (x,y); Ø furo = chumbador + 6 mm (EST-04 nota b)
def grade(B,A,ex,ey,nx=2):
    xs=[ex+(B-2*ex)*i/(nx-1) for i in range(nx)]; return [[round(x),y] for x in xs for y in (ey,A-ey)]
FUR={('EST-04',750,300):grade(750,300,60,50),('EST-04',500,350):grade(500,350,60,50),('EST-04',400,300):grade(400,300,60,50),('EST-04',300,250):grade(300,250,60,50),
     ('EST-09',854,460):grade(854,460,60,63,3),('EST-09',450,450):grade(450,450,60,36),('EST-09',600,300):grade(600,300,60,32),
     ('EST-09',500,350):grade(500,350,60,51),('EST-09',550,300):grade(550,300,60,32)}
PORT={'01':[('Galpão principal',16)],'02':[('',9)],'03':[('',11)],'04':[('',9)],'14':[('',11)],'12':[('',8)],'15':[('',8)],'16':[('Oficina',5)]}
n_ch=n_cb=n_lig=0;conf=[]
def grupo(o,pre,kw):
    for p in D['mat'][o]:
        if p['s']!='estrutura-metalica': continue
        for g in p['g']:
            if kw in g[0] and (not pre or g[0].startswith(pre) or pre in g[0]): return g
for o,parts in D['mat'].items():
    for p in parts:
        if p['s']!='estrutura-metalica': continue
        for g in p['g']: g[0]=g[0].replace(' (peso com ≈6% de perda de corte; compra em barras de 12 m e 6 m, ver anexo)',' (barras de 12 m e 6 m)')
# 1) chapas de base + chumbadores
novos={}
for r in rows:
    gal,pil,q,A,B,e,kgc,kgt,cb,anc,obs=r[:11]
    o,pre=OB[gal]; g=grupo(o,pre,'Chapas de base')
    if g is None: print('sem grupo',gal); continue
    m=re.match(r'(\d+) x Ø(\d+)',cb); nc,dc=int(m.group(1)),int(m.group(2)); quim='químic' in cb or (gal=='Sede bloco fundo' and dc==25)
    if gal=='Sede bloco fundo' and dc==16: quim=True
    A,B=int(A),int(B); L,S=max(A,B),min(A,B); ef=float(e) if float(e)%1 else int(e)
    pr='EST-04' if gal.startswith('Sede') else 'EST-09'
    fu=FUR.get((pr,L,S)); df=dc+6
    pid=pil.split(' ')[0]
    cod=None
    for it in g[1]:
        if it[0].startswith('Chapa de base') and pid.split('/')[0] in it[0]: cod=it[4]
    desc=f"Chapa cortada ASTM A36 {L} x {S} mm – esp. {br(ef)} mm – {nc} furos Ø{df} mm – base do pilar {pil}"
    nota=f"{br(float(kgc))} kg/peça · "+('furação conforme '+pr if fu else 'POSIÇÃO DOS FUROS A CONFIRMAR')
    if not fu: conf.append(f"{o} · chapa {L} x {S} x {br(ef)} ({pid}): posição dos furos")
    ch={'L':L,'S':S,'e':ef,'n':nc,'d':df,'f':fu,'ref':pr if fu else ''}
    it1=[desc,'peça',str(q),'M',cod,nota,ch]
    # chumbador
    proj=50+ef+(10 if gal.startswith('Sede') else 0)+2*dc+20; Lt=int(math.ceil((anc+proj)/50)*50)
    if quim:
        d2=f"Chumbador químico – barra roscada ASTM A193 B7 Ø{dc} mm x {Lt} mm + porca + arruela + adesivo epóxi – {pil}"
    else:
        d2=f"Chumbador ASTM F1554 Gr.36 Ø{dc} mm x {Lt} mm, rosca 150 mm, com 2 porcas + arruela – {pil}"
    n2=f"ancoragem {anc} mm + projeção {int(Lt-anc)} mm (graute 50 + chapa + porcas)"+('' if quim else ' · ponta de ancoragem (gancho ou placa): a confirmar')
    cod2=None
    for it in g[1]:
        if it[0].startswith('Chumbador') and pid.split('/')[0] in it[0]: cod2=it[4]
    novos.setdefault(id(g),(g,[]))[1].extend([it1,[d2,'un',str(q*nc),'M',cod2,n2]])
    if gal.startswith('Sede'):
        novos[id(g)][1].append([f"Arruela de chapa ASTM A36 esp. 10 mm, furo Ø{dc+2} mm – {pil}",'peça',str(q*nc),'E',None,'soldada após o nivelamento (EST-04 nota b) · medida da arruela a confirmar',{'L':0,'S':0,'e':10,'n':1,'d':dc+2,'f':None,'ref':'','arr':1}])
        conf.append(f"{o} · arruela de chapa 10 mm Ø{dc+2} ({pid}): medida")
    n_ch+=1;n_cb+=1
for k,(g,its) in novos.items():
    resto=[it for it in g[1] if not (it[0].startswith('Chapa de base') or it[0].startswith('Chumbador'))]
    g[1]=its+resto
# 2) chapas de ligação: kg -> peças por espessura (detalhe típico EST-04/EST-09: placa de topo 25 mm 8 paraf. Ø22 viga-pilar; 2 placas 20 mm 8 paraf. Ø20 na cumeeira; enrijecedores 12,5 mm)
for o,lst in PORT.items():
    for pre,np_ in lst:
        g=grupo(o,pre,'Terças')
        if g is None: print('sem terças',o,pre); continue
        kg=[it for it in g[1] if it[0].startswith('Chapa de aço ASTM A36 para ligações')]
        if not kg: continue
        k0=kg[0]; tot=k0[2]
        ref='EST-04' if o=='01' else 'EST-09'
        if o in('12','16'):
            nv=[]
            for j,(nm,npp) in enumerate([('vestiários',8)] if o=='12' else [('oficina',5),('apoio',5)]):
                kk=kg[j] if j<len(kg) else k0
                nv.append([f"Chapa cortada ASTM A36 – placas de topo dos pórticos ({nm}) – espessura, medida e furação a confirmar",'peça',str(npp*4),'E',kk[4],f"{npp} pórticos x (2 placas viga-pilar + 2 da cumeeira) · peso estimado {kk[2]} kg",{'L':0,'S':0,'e':0,'n':0,'d':0,'f':None,'ref':''}])
            conf.append(f"{o} · placas de topo dos pórticos leves: espessura, medida e furação")
            i=g[1].index(k0); g[1][i:i+1]=nv; n_lig+=1
            for x in kg[1:]: g[1].remove(x)
            continue
        nv=[[f"Chapa cortada ASTM A36 esp. 25 mm – placa de topo viga-pilar – 8 furos Ø24 mm (A325 Ø22)",'peça',str(np_*2),'E',k0[4],f"{np_} pórticos x 2 ligações (1 placa por ligação) · {ref} · medida a confirmar · peso total das ligações estimado {tot} kg",{'L':0,'S':0,'e':25,'n':8,'d':24,'f':None,'ref':ref}],
            [f"Chapa cortada ASTM A36 esp. 20 mm – placa de topo da cumeeira – 8 furos Ø22 mm (A325 Ø20)",'peça',str(np_*2),'E',None,f"{np_} pórticos x 2 placas · {ref} · medida a confirmar",{'L':0,'S':0,'e':20,'n':8,'d':22,'f':None,'ref':ref}],
            [f"Chapa cortada ASTM A36 esp. 12,5 mm – enrijecedor do pilar (sem furo)",'peça',str(np_*2*4),'E',None,f"{np_} pórticos x 2 ligações x 4 · {ref} · medida a confirmar",{'L':0,'S':0,'e':12.5,'n':0,'d':0,'f':None,'ref':ref}]]
        conf.append(f"{o}{' '+pre if pre else ''} · placas de topo 25/20 mm e enrijecedores 12,5 mm: medidas (executivo); enrijecedores das bases engastadas e chapas de contraventamento: medidas e quantidades")
        i=g[1].index(k0); g[1][i:i+1]=nv; n_lig+=1
        for x in kg[1:]: g[1].remove(x)
g=grupo('01','Bloco de fundo','Terças')
for it in g[1]:
    if it[0].startswith('Chapa de aço ASTM A36 para ligações'):
        it[0]='Chapa ASTM A36 – ligações das vigas de piso do bloco de fundo (VS/VP) – espessura, medida e quantidade a confirmar'
        it[5]='peso estimado (5% dos perfis W) · NÃO COTAR antes do detalhamento das ligações'
        conf.append('01 Bloco de fundo · chapas de ligação das vigas de piso: espessura, medida e quantidade')
# 3) chapas dos pilaretes da frente (fechamento)
for o in ('02','03','04'):
    for p in D['mat'][o]:
        for g in p['g']:
            for it in g[1]:
                if it[0].startswith('FRENTE – chapas de base + insertos'):
                    it[0]='Chapa cortada ASTM A36 – base e insert dos pilaretes da frente (2 por pilarete)'; it[1]='peça'
                    it[5]='espessura, medida e furação a confirmar (EST-13/14/15 mostram só "chapa de base + 4 chumbadores")'
                    conf.append(f"{o} · chapas dos pilaretes da frente: espessura, medida e furação")
REL['chapas']={'bases':n_ch,'chumbadores':n_cb,'ligacoes_obras':n_lig,'a_confirmar':conf}
json.dump(D,open('site/data.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(REL,open('limpa_rel.json','w'),ensure_ascii=False,indent=1)
print(n_ch,n_cb,n_lig);print('\n'.join(conf))
