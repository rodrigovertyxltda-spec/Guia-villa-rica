/* Service worker: precache do app (cache-first); pranchas em cache sob demanda */
const V='guia-@@VER@@',SHELL=@@SHELL@@,PR='guia-pranchas';
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==PR).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;
  const key=u.pathname.endsWith('/')?new Request(u.pathname+'index.html'):r;
  e.respondWith(caches.match(key,{ignoreSearch:true}).then(hit=>hit||fetch(r).then(res=>{if(res.ok&&/\/p\/.*\.webp$/.test(u.pathname)){const cp=res.clone();caches.open(PR).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match('index.html'))))});
/* Background Sync: ponto de integração. Quando houver servidor, avisar a página para chamar API.enviar(). */
self.addEventListener('sync',e=>{if(e.tag==='vr-envio') e.waitUntil(self.clients.matchAll().then(cs=>cs.forEach(c=>c.postMessage({tipo:'enviar'}))))});
