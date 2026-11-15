import json,re
D=json.load(open('site/data.json'));R=json.load(open('limpa_rel.json'))
n=0
for o,parts in D['mat'].items():
  for p in parts:
    for gi,(gn,its) in enumerate(p['g']):
      out=[]
      for it in its:
        it=list(it)+['']*(6-len(it))
        d,u=it[0],it[1]
        m=re.search(r'\s*\(barra (\d) m\)$',d)
        if u=='barra' and m: it[0]=d[:m.start()]; it[1]=f'barra {m.group(1)} m'; out.append(it); continue
        if u=='rolo' and 'rolo 2,00 x 25 m' in d: it[1]='rolo 50 m²'
        if 'peso dos pilaretes' in d: n+=1; continue
        if 'TUBO 150 x 100 x 4,75' in d:
          it[0]='Tubo retangular 150 x 100 x 4,75 mm – barra 6 m (pilaretes da frente)'; it[1]='barra 6 m'
          it[5]='≈ 18,6 kg/m · 112 kg/barra · 781 kg'; n+=1
        if u=='+' and 'equalização 72' in d:
          it[0]='Tanque de equalização 72 m³ fechado'; it[1]='un'; it[2]='1'
          out.append(it); out.append(['Bomba de elevação de esgoto (tanque de equalização)','un','2',it[3],None,'']); n+=1; continue
        if u=='/' and 'caixa de gordura da un 1 doca' in d:
          it[0]='Caixa de lavagem de pátio c/ grelha (pátio de carga 28)'; it[1]='un'; it[2]='1'
          out.append(it); out.append(['Caixa de gordura da doca (pátio de carga 28)','un','1',it[3],None,'']); n+=1; continue
        if u=='/' and 'bocas de lobo' in d:
          it[0]='Boca de lobo c/ grelha (estacionamento 27)'; it[1]='un'; it[2]='7'
          out.append(it); out.append(['Caixa separadora de água e óleo G-5 (estacionamento 27)','un','1',it[3],None,'']); n+=1; continue
        out.append(it)
      p['g'][gi][1]=out
R['fix2']=n
json.dump(D,open('site/data.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(R,open('limpa_rel.json','w'),ensure_ascii=False,indent=1)
print('fix2',n)
