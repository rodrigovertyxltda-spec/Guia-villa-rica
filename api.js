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
function notify(c){(subs[c]||[]).forEach(f=>f());try{navigator.serviceWorker&&navigator.serviceWorker.ready.then(r=>r.sync&&r.sync.register('vr-envio')).catch(()=>{})}catch(_){}}
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
window.API={local:true,
  pendentes:async()=>(await all('docs')).filter(([,v])=>v&&v._pend).length,
  enviar:async()=>{/* integração futura: enviar registros com _pend e os blobs; ao confirmar, gravar _pend:false */ return {enviados:0,motivo:'aguardando integração'}}};
window.claude={use:async n=>{await ready;return n==='db'?DB:n==='assets'?AS:n==='user'?US:null}};
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(_){}
})();
