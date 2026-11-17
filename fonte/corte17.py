# Corte de escopo 17/11/2026: prédio de serviços (15), Arena (14), estacionamento (18), pátio de carga (19)
import json
S='site/data.json';D=json.load(open(S));CUT={'14','15','18','19'}
keep=set()
for o,l in D['obraDocs'].items():
    if o not in CUT: keep|=set(l)
gone=sorted({k for o in CUT for k in D['obraDocs'].get(o,[])}-keep-{'hid-10','urb-04'})
D['obraDocs'].setdefault('00',[]).append('hid-10') if 'hid-10' not in D['obraDocs'].get('00',[]) else None
D['obraDocs'].setdefault('16',[]).append('urb-04') if 'urb-04' not in D['obraDocs'].get('16',[]) else None
print('docs que saem',[(k,D['docs'][k]['t']) for k in gone])
for k in gone: D['docs'].pop(k,None)
D['obras']=[o for o in D['obras'] if o[0] not in CUT]
for key in ('mat','exe','obraDocs','linha','resumo'):
    for o in CUT: D.get(key,{}).pop(o,None)
n=len(D['kb']);D['kb']=[k for k in D['kb'] if not (k[2] and set(k[2])<=CUT) and not (k[1] and set(k[1])<=set(gone))]
print('kb',n,'->',len(D['kb']))
n=len(D['guias']);D['guias']=[g for g in D['guias'] if g.get('o') not in CUT];print('guias',n,'->',len(D['guias']))
json.dump(D,open(S,'w'),ensure_ascii=False,separators=(',',':'))
json.dump(gone,open('corte17-docs.json','w'))
