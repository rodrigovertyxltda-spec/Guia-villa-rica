import openpyxl,json
S='site/data.json';D=json.load(open(S))
wb=openpyxl.load_workbook('/mnt/project-files/orcamento/villa-rica-orcamento-cronograma-v6.xlsx',read_only=True,data_only=True)
rows=[r for r in wb['Físico-financeiro'].iter_rows(values_only=True) if any(x is not None for x in r)]
hdr=rows[0];ix=[i for i,h in enumerate(hdr) if isinstance(h,str) and '/' in h][:24]
cr=[]
for i,r in enumerate(rows):
    if r[1]=='R$':
        m=rows[i+1];a=rows[i+2]
        # linhas de % deslocadas uma coluna à esquerda (sem coluna Total)
        mm=[float(x or 0) for x in m[3:27]];aa=[float(x or 0) for x in a[3:27]];assert len(mm)==24
        cr.append([r[0],[1 if v>0.0001 else 0 for v in mm],[round(v*100,1) for v in mm],[round(v*100,1) for v in aa]])
assert len(cr)==24
old={c[0]:c for c in D['crono']}
ren={'Quadras externas (futebol 7, beach tennis, vôlei)':'Quadras externas (futebol 7, beach tennis, peteca)'}
D['crono']=cr
for o,ls in D['linha'].items(): D['linha'][o]=[ren.get(x,x) for x in ls]
pr=[r for r in wb['Mensal por pacote'].iter_rows(values_only=True) if r[0]]
D['pac']=[[r[0],[round(float(x or 0)/float(r[1])*100,1) for x in r[2:26]]] for r in pr[1:] if r[0]!='TOTAL']
dr=[r for r in wb['Desembolso mensal'].iter_rows(values_only=True) if r[0] and '/' in str(r[0])]
D['des']=[[r[0],round(float(r[4])*100,1)] for r in dr]
D['obras'][10]=['10','Quadras de peteca','3 pisos de 21 x 11 m']
D['resumo']['10']=['3 pisos de quadra de peteca, 21 x 11 m cada (não é laje), conforme ESP-04.']
json.dump(D,open(S,'w'),ensure_ascii=False,separators=(',',':'))
print([ (c[0][:20],c[3][-1]) for c in cr][:5]);print(D['pac'][0][:2]);print(D['des'][:3],D['des'][-1])
