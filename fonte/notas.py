import re,glob,os,json
B='/mnt/project-files/projetos/'
fs=sorted(glob.glob(B+'estrutural/R02/*.dxf')+glob.glob(B+'estrutural/EST-18*.dxf')+glob.glob(B+'hidraulico/*.dxf')+glob.glob(B+'piscinas/*.dxf')+glob.glob(B+'esportes/*.dxf')+glob.glob(B+'eletrico/dxf/*.dxf')+glob.glob(B+'arquitetura/dxf/*.dxf'))
fs=[f for f in fs if not re.search(r'IMP-0[12]|HID-13',os.path.basename(f))]
MK=re.compile(r'^(?:[a-z]\)|\d{1,2}[.)]|[•\-–] )\s*')
out=[]
for f in fs:
  L=[x.strip() for x in open(f,errors='ignore').read().split('\n')]
  T=[]
  for c,v in zip(L[0::2],L[1::2]):
    if c in('1','3') : T.append(v)
  T=[re.sub(r'\\P',' ',re.sub(r'\{\\[^;]*;|\}|\\[A-Za-z][^;]*;','',t)).strip() for t in T]
  notas=[];cur=None
  for t in T:
    if not t or len(t)<3: continue
    if MK.match(t) and len(t)>25:
      if cur: notas.append(cur)
      cur=MK.sub('',t)
    elif cur is not None and len(t)>20 and t[0].islower() or (cur and cur.rstrip()[-1:] not in '.:' and len(t)>30 and not t.isupper()):
      cur+=' '+t
    else:
      if cur: notas.append(cur);cur=None
  if cur: notas.append(cur)
  # also "Memorial ..." lines
  m_=re.search(r'([A-Z]{3}-\d+[A-Z]?)',os.path.basename(f).upper());cod=m_.group(1) if m_ else os.path.basename(f)[:20]
  out.append({'f':os.path.basename(f),'c':cod,'n':[n for n in notas if len(n)>40]})
json.dump(out,open('notas.json','w'),ensure_ascii=False,indent=0)
print(len(fs),sum(len(x['n']) for x in out))
for x in out[:6]+out[20:24]+out[40:44]: print('==',x['f']);[print('  -',n[:200]) for n in x['n'][:8]]
