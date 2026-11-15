import json,os,glob,hashlib,shutil
S=os.path.dirname(os.path.abspath(__file__));O=S+'/pwa'
a=open(S+'/app.html').read()
def rep(x,y,cnt=1):
    global a
    assert x in a,x[:70]; a=a.replace(x,y) if cnt==0 else a.replace(x,y,cnt)
rep('<link rel="preconnect" href="https://fonts.googleapis.com">\n','')
i=a.index('<link rel="stylesheet" href="https://fonts.googleapis.com');j=a.index('>',i)+1;a=a[:i]+a[j:]
head='''<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0D1526" media="(prefers-color-scheme: dark)"><meta name="theme-color" content="#EEF2F7" media="(prefers-color-scheme: light)">
<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icons/icon-180.png"><link rel="icon" href="icons/icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Guia de Obra"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<style>@font-face{font-family:"Nunito";font-weight:400;src:url(fonts/Nunito-Regular.ttf)}@font-face{font-family:"Nunito";font-weight:500 700;src:url(fonts/Nunito-Bold.ttf)}@font-face{font-family:"Nunito";font-weight:800 900;src:url(fonts/Nunito-Black.ttf)}
.it.comprado{opacity:.75}.it .cp{grid-column:1/-1;font-size:.75rem;font-weight:800;color:var(--verde-tx)}</style>
<script src="api.js"></script>
'''
a='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'+head+a.replace('<title>','<title>',1)
a=a.replace('<div class="wrap" id="app">','</head><body><div class="wrap" id="app">',1)+'</body></html>'
rep('src="p/${k}-1.jpg"','src="pt/${k}-1.webp"',0)
rep('src="p/${k}-${i+1}.jpg"','src="p/${k}-${i+1}.webp"',0);rep('data-zoom="p/${k}-${i+1}.jpg"','data-zoom="p/${k}-${i+1}.webp"',0)
rep('toast("Feito. Já aparece para todos.")','toast("Feito. Salvo neste aparelho.")')
rep('toast("Foto salva. Já aparece para todos.")','toast("Foto salva neste aparelho.")')
rep('Só a diretoria vê as denúncias.','Fica guardada neste aparelho até a integração com o sistema.')
rep("Abra o guia pelo link, com internet e conectado à sua conta, para ver o histórico.","Histórico indisponível.")
rep('<p style="color:var(--txt-2);margin:6px 4px 12px">Quem trocou, tirou ou anexou arquivo de projeto, e quando.</p>','<p style="color:var(--txt-2);margin:6px 4px 12px">Quem trocou, tirou ou anexou arquivo, baixou projeto, deu baixa por NF, e quando.</p><p id="pend" class="integra" style="margin:0 0 12px"></p>')
rep('if(!DB) return;\n  DB.collection("historico")','pendInfo();if(!DB) return;\n  DB.collection("historico")')
# baixar obra offline no topo de Projeto e documentos
rep('''  app.innerHTML=cabObra(o,"-docs")+`<a class="pilula clara"''','''  const offOk=(()=>{try{return localStorage.getItem("vr-off-"+n)==="1"}catch(_){return false}})();
  app.innerHTML=cabObra(o,"-docs")+`<button class="pilula verde" data-off="${n}" style="margin:4px 0 10px;padding:12px">${offOk?"✓ Pranchas desta obra salvas · atualizar":"Baixar pranchas desta obra para usar sem internet"}</button>`+`<a class="pilula clara"''')
rep('<p class="aviso">${totPg} páginas','<p class="aviso">Aplicativo instalado: funciona sem internet. ${totPg} páginas')
# extras antes de rota
rep('\nfunction rota(){',open(S+'/pwasrc/extra.js').read()+'\n'+open(S+'/pwasrc/compras.js').read()+'\nfunction rota(){')
a=a.replace('@@STYLE@@',open(S+'/style.css.html').read()).replace('@@LOGO@@',open(S+'/logo.b64').read()).replace('@@TROCA@@',open(S+'/troca.hash.json').read())
a=a.replace('<meta name="claude:viewport-fit-sides" content="cover">','')
open(O+'/index.html','w').write(a)
shutil.copy(S+'/pwasrc/api.js',O+'/api.js');shutil.copy(S+'/site/data.json',O+'/data.json')
json.dump({"name":"Guia de Obra","short_name":"Guia de Obra","start_url":"./","scope":"./","display":"standalone","background_color":"#0D1526","theme_color":"#F26A10","lang":"pt-BR",
 "icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png","purpose":"any maskable"},{"src":"icons/icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]},open(O+'/manifest.webmanifest','w'),ensure_ascii=False,indent=1)
shell=['./','index.html','api.js','data.json','fin.enc.json','cmp.enc.json','jspdf.min.js','logo-oc.jpg','manifest.webmanifest']+[os.path.relpath(f,O) for f in sorted(glob.glob(O+'/icons/*')+glob.glob(O+'/fonts/*')+glob.glob(O+'/f/*')+glob.glob(O+'/pt/*'))]
h=hashlib.sha256(b''.join(open(O+'/'+(x if x!='./' else 'index.html'),'rb').read() for x in shell)).hexdigest()[:10]
sw=open(S+'/pwasrc/sw.js').read().replace('@@VER@@',h).replace('@@SHELL@@',json.dumps(shell))
open(O+'/sw.js','w').write(sw)
print('versão',h,'shell',len(shell))
