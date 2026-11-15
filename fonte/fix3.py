import json,re
D=json.load(open('site/data.json'));n=0
AC=' – acabamento: preta / galvalume / pré-pintada branca (escolher na cotação)'
for o,parts in D['mat'].items():
  for p in parts:
    for gn,its in p['g']:
      for it in its:
        if it[0].startswith('Telha zipada') and 'acabamento' not in it[0]:
          it[0]+=AC; n+=1
        if len(it)>5 and it[5]:
          w=it[5].split(' · ')
          if len(w)>1 and w[0]==w[-1]: it[5]=' · '.join(w[1:])
json.dump(D,open('site/data.json','w'),ensure_ascii=False,separators=(',',':'))
print('telhas',n)
