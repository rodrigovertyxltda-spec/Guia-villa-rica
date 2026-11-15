/* Camada de API do Guia (interface única).
   Hoje: grava tudo NESTE APARELHO (IndexedDB) e marca como pendente de envio.
   Integração futura (sistema do Luiz Felipe): implementar API.enviar() para mandar
   os registros pendentes e as fotos/arquivos ao servidor; a tela não precisa mudar. */
(function(){
const DBN='villarica-guia';let dbp;
function idb(){return dbp||(dbp=new Promise((res,rej)=>{const r=indexedDB.open(DBN,1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('docs');d.createObjectStore('blobs')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))}
const rq=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function st(name,mode){const d=await idb();return d.transaction(name,mode).objectStore(name)}
const get=async(s,k)=>rq((await st(s,'readonly')).get(k));
const put=async(s,k,v)=>rq((await st(s,'readwrite')).put(v,k));
const del=async(s,k)=>rq((await st(s,'readwrite')).delete(k));
async function all(s){const o=await st(s,'readonly');const ks=await rq(o.getAllKeys());const o2=await st(s,'readonly');const vs=await rq(o2.getAll());return ks.map((k,i)=>[k,vs[i]])}
const URLS={};const subs={};
function fix(v){if(!v||typeof v!=='object')return v;const o=Array.isArray(v)?v.map(fix):{...v};
  if(!Array.isArray(o)){for(const k in o) if(o[k]&&typeof o[k]==='object') o[k]=fix(o[k]); if(o.asset&&URLS[o.asset]) o.url=URLS[o.asset]}return o}
const snapDoc=(id,v)=>({id,exists:v!==undefined,data:()=>v===undefined?undefined:fix(v),metadata:{fromCache:true,hasPendingWrites:!!(v&&v._pend)}});
async function list(c){const p=c+'/';return (await all('docs')).filter(([k])=>k.startsWith(p)&&!k.slice(p.length).includes('/')).map(([k,v])=>snapDoc(k.slice(p.length),v))}
function notify(c){(subs[c]||[]).forEach(f=>f());try{clearTimeout(window.__vrSync);window.__vrSync=setTimeout(()=>window.API&&API.configurado()&&API.sincronizar(),1500)}catch(_){}try{navigator.serviceWorker&&navigator.serviceWorker.ready.then(r=>r.sync&&r.sync.register('vr-envio')).catch(()=>{})}catch(_){}}
const rid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
function col(c){
  const q={path:c,
    doc(id){id=id||rid();const k=c+'/'+id;return{id,path:k,
      get:async()=>snapDoc(id,await get('docs',k)),
      set:async v=>{await put('docs',k,{...v,_pend:true,_em:new Date().toISOString()});notify(c)},
      update:async v=>{const o=await get('docs',k)||{};await put('docs',k,{...o,...v,_pend:true});notify(c)},
      delete:async()=>{await del('docs',k);notify(c)},
      collection:s=>col(k+'/'+s)}},
    add:async v=>{const d=q.doc();await d.set(v);return d},
    where(){return q},orderBy(){return q},limit(){return q},
    get:async()=>{const d=await list(c);return{docs:d,size:d.length,empty:!d.length,docChanges:()=>[],metadata:{fromCache:true}}},
    onSnapshot(fn,err){const run=()=>q.get().then(fn).catch(e=>err&&err(e));(subs[c]=subs[c]||[]).push(run);run();return()=>{subs[c]=(subs[c]||[]).filter(x=>x!==run)}}};
  return q}
const DB={collection:col,doc:p=>{const i=p.lastIndexOf('/');return col(p.slice(0,i)).doc(p.slice(i+1))}};
const AS={upload:async b=>{const id=rid();await put('blobs',id,b);URLS[id]=URL.createObjectURL(b);return{id,url:URLS[id],sizeBytes:b.size,contentType:b.type||'application/octet-stream'}},
  list:async()=>({assets:[],usage:{}}),delete:async id=>{await del('blobs',id);return{deleted:true}}};
let dev='';try{dev=localStorage.getItem('vr-dev')||'';if(!dev){dev='d-'+rid();localStorage.setItem('vr-dev',dev)}}catch(_){dev='d-local'}
const US={id:async()=>dev,me:async()=>({id:dev}),isOwner:()=>true,canEdit:()=>true,can:()=>true,profiles:async()=>({})};
const ready=(async()=>{try{for(const [k,b] of await all('blobs')) URLS[k]=URL.createObjectURL(b)}catch(_){}})();
/* ===== Sincronização com o servidor (sistema do Luiz Felipe) =====
   Contrato (ver INTEGRACAO.md):
   GET  {API}/status                      -> 200 {ok:true}
   POST {API}/arquivos   (multipart: id, arquivo)          -> {id, url}
   POST {API}/registros  JSON {dispositivo, registros:[{colecao,id,dados}]} -> {ok:[ids]}
   GET  {API}/registros?desde=ISO          -> {registros:[{colecao,id,dados,atualizado}], agora:ISO}
   POST {API}/sequencia/{ocs|cotacoes}     -> {num:"DDMMAA-NN"}
   Cabeçalho: Authorization: Bearer {token} (token salvo em Configurações). */
const cfg=()=>{let url='',tok='';try{url=(localStorage.getItem('vr-api')||'').replace(/\/+$/,'');tok=localStorage.getItem('vr-api-token')||''}catch(_){}return{url,tok}};
const hdr=t=>t?{Authorization:'Bearer '+t}:{};
let rodando=false,ultimo={quando:null,enviados:0,recebidos:0,erro:''};
async function enviar(){const {url,tok}=cfg();if(!url)return{enviados:0,motivo:'sem endereço da API'};if(!navigator.onLine)return{enviados:0,motivo:'sem internet'};
  const pend=(await all('docs')).filter(([,v])=>v&&v._pend);if(!pend.length)return{enviados:0};
  const regs=[];
  for(const [k,v] of pend){const i=k.lastIndexOf('/'),colecao=k.slice(0,i),id=k.slice(i+1),dados={...v};delete dados._pend;
    if(dados.asset&&!dados._urlServ){const b=await get('blobs',dados.asset);if(b){const fd=new FormData();fd.append('id',dados.asset);fd.append('arquivo',b,dados.asset);
      const r=await fetch(url+'/arquivos',{method:'POST',headers:hdr(tok),body:fd});if(!r.ok)throw new Error('arquivos '+r.status);const j=await r.json();dados._urlServ=j.url||'';v._urlServ=dados._urlServ}}
    delete dados.url;regs.push({colecao,id,dados,k,v})}
  for(let s=0;s<regs.length;s+=200){const lote=regs.slice(s,s+200);
    const r=await fetch(url+'/registros',{method:'POST',headers:{...hdr(tok),'Content-Type':'application/json'},body:JSON.stringify({dispositivo:dev,registros:lote.map(x=>({colecao:x.colecao,id:x.id,dados:x.dados}))})});
    if(!r.ok)throw new Error('registros '+r.status);
    for(const x of lote){x.v._pend=false;x.v._env=new Date().toISOString();await put('docs',x.k,x.v)}}
  return{enviados:regs.length}}
async function receber(){const {url,tok}=cfg();if(!url||!navigator.onLine)return{recebidos:0};let desde='';try{desde=localStorage.getItem('vr-api-desde')||''}catch(_){}
  const r=await fetch(url+'/registros'+(desde?'?desde='+encodeURIComponent(desde):''),{headers:hdr(tok)});if(!r.ok)throw new Error('receber '+r.status);
  const j=await r.json(),cols=new Set();let n=0;
  for(const x of (j.registros||[])){const k=x.colecao+'/'+x.id,cur=await get('docs',k);if(cur&&cur._pend)continue;const d={...x.dados,_pend:false};if(d._urlServ&&!d.url)d.url=d._urlServ;await put('docs',k,d);cols.add(x.colecao.split('/')[0]);n++}
  try{if(j.agora)localStorage.setItem('vr-api-desde',j.agora)}catch(_){}
  cols.forEach(c=>(subs[c]||[]).forEach(f=>f()));if(n)try{dispatchEvent(new CustomEvent('vr-sync',{detail:{recebidos:n}}))}catch(_){}return{recebidos:n}}
async function sincronizar(){if(rodando)return ultimo;rodando=true;try{const a=await enviar(),b=await receber();ultimo={quando:new Date().toISOString(),enviados:a.enviados||0,recebidos:b.recebidos||0,erro:a.motivo||''}}
  catch(e){ultimo={...ultimo,quando:new Date().toISOString(),erro:String(e.message||e)}}rodando=false;return ultimo}
window.API={local:true,
  configurado:()=>!!cfg().url,
  pendentes:async()=>(await all('docs')).filter(([,v])=>v&&v._pend).length,
  enviar,receber,sincronizar,ultimo:()=>ultimo,
  testar:async()=>{const {url,tok}=cfg();if(!url)return'sem endereço';const r=await fetch(url+'/status',{headers:hdr(tok)});return r.status},
  /* numeração única: com servidor, o número vem dele; sem servidor (ou offline), o app numera localmente */
  numero:async tipo=>{const {url,tok}=cfg();if(!url||!navigator.onLine)return null;try{const r=await fetch(url+'/sequencia/'+tipo,{method:'POST',headers:hdr(tok)});if(!r.ok)return null;return (await r.json()).num||null}catch(_){return null}}};
addEventListener('online',()=>sincronizar());setInterval(()=>{if(cfg().url)sincronizar()},60000);setTimeout(()=>{if(cfg().url)sincronizar()},3000);
try{navigator.serviceWorker&&navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.tipo==='enviar')sincronizar()})}catch(_){}
window.claude={use:async n=>{await ready;return n==='db'?DB:n==='assets'?AS:n==='user'?US:null}};
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(_){}
})();
