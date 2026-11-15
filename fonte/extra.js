/* ===== Extras do aplicativo ===== */
let BX={};
function ligaBaixas(){if(!DB)return;DB.collection("baixas").onSnapshot(s=>{const n={};s.docs.forEach(d=>{const v=d.data();(v&&v.itens||[]).forEach(k=>n[k]=v)});BX=n;
  const m=location.hash.match(/^#obra-(\d\d)-mat/);if(m&&!document.getElementById("mt")) rota()})}
setTimeout(()=>{const t=setInterval(()=>{if(DB){clearInterval(t);ligaBaixas()}},300)},300);
function parteHTML(n,p,filtro){
  let tot=0;const gs=p.g.map((g,gi)=>{const its=g[1].map((it,ii)=>[it,`${n}|${p.s}|${gi}|${ii}`]).filter(x=>!filtro||filtro(x[0]));tot+=its.length;
    return its.length?`<div class="sub">${esc(g[0])}</div>${its.map(([it,k])=>{const b=BX[k];return itemHTML(it).replace('<div class="it">',`<div class="it${b?" comprado":""}">`).replace(/<\/div>$/,b?`<span class="cp">✓ Recebido · NF ${esc(b.nf||"")} · ${dt(b.em)}</span></div>`:"</div>")}).join("")}`:""}).join("");
  if(!tot) return "";
  return `<section class="parte" id="pt-${p.s}"><div class="parte-h"><h3>${esc(p.p)}</h3><button class="mini clara" data-bx="${n}|${p.s}">Baixa NF</button><button class="mini" data-copy="${n}|${p.s}">Copiar lista</button></div><span class="fam-tag">${esc(p.f)} · ${tot} itens</span>${gs}</section>`;
}
function abreBaixa(n,s){
  const p=(D.mat[n]||[]).find(x=>x.s===s);if(!p) return;
  const its=p.g.flatMap((g,gi)=>g[1].map((i,ii)=>[i,`${n}|${p.s}|${gi}|${ii}`]));
  let nm="";try{nm=localStorage.getItem("vr-tr-nome")||""}catch(_){}
  const m=document.createElement("div");m.id="mt";m.className="modal";
  m.innerHTML=`<form class="login" style="margin:0;width:100%"><h1 style="font-size:1.4rem">Dar baixa com nota fiscal</h1><p>${esc(n+" "+obra(n)[1])} · ${esc(p.p)}</p>
   <label class="arq"><input id="bf" type="file" accept="application/pdf,image/*"><span id="bfn">1. Anexar foto ou PDF da nota fiscal</span></label>
   <div class="campo"><i style="background:var(--agua)"></i><input id="bn" placeholder="2. Número da nota fiscal" maxlength="30"></div>
   <select id="boc" class="sel" hidden style="width:100%"><option value="">Ordem de compra (opcional)</option></select>
   <div style="font-weight:800;font-size:.9rem">3. Marcar os itens que chegaram</div>
   <div class="bx">${its.map(([i,k])=>`<label><input type="checkbox" value="${k}" ${BX[k]?"checked disabled":""}> <span>${esc(i[0])}</span><small>${esc(i[2])} ${esc(i[1])}</small></label>`).join("")}</div>
   <div class="campo"><i style="background:var(--folha)"></i><input id="tn" placeholder="Seu nome" value="${esc(nm)}" maxlength="60"></div>
   <button class="pilula" type="submit" id="tb">Dar baixa</button><button class="pilula clara" type="button" id="tx">Fechar</button>
   <p class="integra" style="margin:0">Fica salvo neste aparelho e vai para o sistema quando a integração estiver pronta.</p>
   <p id="te" hidden style="color:#DC2626;font-weight:800;margin:0;text-align:center"></p></form>`;
  document.body.appendChild(m);const $=id=>m.querySelector("#"+id);$("tx").onclick=()=>m.remove();
  if(DB) DB.collection("ocs").get().then(s=>{const pre=`${n}|${p.s}|`,os=s.docs.map(d=>d.data()).filter(o=>o.status==="liberada"&&o.itens.some(x=>x.r.some(r=>r.k.startsWith(pre))));if(!os.length)return;
    const sel=$("boc");sel.hidden=false;sel.innerHTML+=os.map((o,i)=>`<option value="${i}">OC ${esc(o.num)} · ${esc(o.forn.nome)}</option>`).join("");
    sel.onchange=()=>{const o=os[+sel.value];if(!o)return;const ks=new Set(o.itens.flatMap(x=>x.r.map(r=>r.k)));m.querySelectorAll(".bx input:not(:disabled)").forEach(c=>c.checked=ks.has(c.value))}}).catch(()=>{});
  $("bf").onchange=()=>{const f=$("bf").files[0];$("bfn").textContent=f?f.name:"1. Anexar foto ou PDF da nota fiscal"};
  m.querySelector("form").addEventListener("submit",async e=>{e.preventDefault();const sel=[...m.querySelectorAll(".bx input:checked:not(:disabled)")].map(x=>x.value),f=$("bf").files[0],nome=$("tn").value.trim();
    const er=t=>{$("te").textContent=t;$("te").hidden=false};
    if(!f) return er("Anexe a nota fiscal.");if(!$("bn").value.trim()) return er("Digite o número da nota.");if(!sel.length) return er("Marque pelo menos um item.");if(nome.length<2) return er("Digite seu nome.");
    try{localStorage.setItem("vr-tr-nome",nome)}catch(_){}
    const up=await AS.upload(f);await DB.collection("baixas").add({obra:n,parte:p.s,itens:sel,nf:$("bn").value.trim(),oc:($("boc").value!==""&&$("boc").selectedOptions[0])?$("boc").selectedOptions[0].textContent:"",nome,asset:up.id,url:up.url,tipo:up.contentType,em:new Date().toISOString()});
    await DB.collection("historico").add({acao:"deu baixa (NF "+$("bn").value.trim()+")",cod:p.p,titulo:sel.length+" itens",obra:n,nome,papel:"",em:new Date().toISOString(),doc:""});
    m.remove();toast("Baixa registrada neste aparelho.");if(typeof cmpStatus==="function")cmpStatus();rota()});
}
async function baixarObra(n,bt){
  const ks=D.obraDocs[n]||[],urls=[];ks.forEach(k=>{for(let i=1;i<=D.docs[k].n;i++) urls.push(`p/${k}-${i}.webp`)});
  let ok=0;bt.disabled=true;
  for(const u of urls){try{const r=await fetch(u);if(r.ok)ok++}catch(_){}bt.textContent=`Baixando… ${ok}/${urls.length}`}
  bt.textContent=ok===urls.length?`✓ Pranchas desta obra salvas (${ok})`:`Baixou ${ok} de ${urls.length}. Tente de novo com internet.`;bt.disabled=false;
  try{localStorage.setItem("vr-off-"+n,ok===urls.length?"1":"")}catch(_){}
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-off]");if(!b)return;e.preventDefault();baixarObra(b.dataset.off,b)});
async function pendInfo(){try{const n=await API.pendentes();const el=document.getElementById("pend");if(el) el.textContent=n?`${n} registro(s) guardado(s) neste aparelho, aguardando a integração com o sistema.`:""}catch(_){}}
if("serviceWorker" in navigator) addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
/* ===== Baixar projetos (só com senha) ===== */
{const st=document.createElement("style");st.textContent=".dlb>span:nth-child(2){flex:1;text-align:left}.dlb .ok{flex:none;font-weight:800;color:var(--verde-tx)}";document.head.appendChild(st)}
let DLJ=null,DLK=null,DLP="",DLN="";
const b64u=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function dlLista(){if(!DLJ){const r=await fetch("dl/dl.json",{cache:"no-store"});if(!r.ok)throw 0;DLJ=await r.json()}return DLJ}
async function dlAbrir(senha){const j=await dlLista(),pw=new TextEncoder().encode(senha.trim().toLowerCase());
  const base=await crypto.subtle.importKey("raw",pw,"PBKDF2",false,["deriveKey"]);
  for(const u of j.u){try{const kek=await crypto.subtle.deriveKey({name:"PBKDF2",salt:b64u(u.s),iterations:j.it,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["decrypt"]);
    const raw=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64u(u.iv)},kek,b64u(u.k));return crypto.subtle.importKey("raw",raw,"AES-GCM",false,["decrypt"])}catch(_){}}
  throw new Error("senha")}
const mb=n=>(n/1048576).toLocaleString("pt-BR",{maximumFractionDigits:1})+" MB";
function dlLogin(depois){let nm="";try{nm=localStorage.getItem("vr-tr-nome")||""}catch(_){}
  const m=document.createElement("div");m.id="mt";m.className="modal";
  m.innerHTML=`<form class="login" style="margin:0;width:100%"><h1 style="font-size:1.4rem">Baixar projetos</h1><p>Só para quem tem senha. Digite seu nome e a senha.</p>
   <div class="campo"><i style="background:var(--folha)"></i><input id="tn" placeholder="Seu nome" value="${esc(nm)}" maxlength="60" autocomplete="name"></div>
   <div class="campo"><i style="background:var(--terra)"></i><input id="ts" type="password" placeholder="Senha" autocomplete="current-password"></div>
   <button class="pilula" type="submit" id="tb">Liberar</button><button class="pilula clara" type="button" id="tx">Fechar</button>
   <p id="te" hidden style="color:#DC2626;font-weight:800;margin:0;text-align:center"></p></form>`;
  document.body.appendChild(m);const $=id=>m.querySelector("#"+id);$("tx").onclick=()=>m.remove();setTimeout(()=>$(nm?"ts":"tn").focus(),50);
  m.querySelector("form").addEventListener("submit",async e=>{e.preventDefault();const nome=$("tn").value.trim(),er=t=>{$("te").textContent=t;$("te").hidden=false};
    if(nome.length<2) return er("Digite seu nome.");if(!$("ts").value) return er("Digite a senha.");
    $("tb").disabled=true;$("tb").textContent="Conferindo…";
    try{DLK=await dlAbrir($("ts").value);DLN=nome;try{localStorage.setItem("vr-tr-nome",nome)}catch(_){}m.remove();{const en=document.getElementById("dlent");if(en)en.remove()}depois&&depois()}
    catch(x){$("tb").disabled=false;$("tb").textContent="Liberar";er(x&&x.message==="senha"?"Senha errada.":"Sem internet. Conecte para baixar.")}});
}
async function dlBaixar(id,bt){const f=(await dlLista()).f.find(x=>x.id===id);if(!f)return;
  if(!DLK) return dlLogin(()=>dlBaixar(id,bt));
  const txt=bt.innerHTML;bt.disabled=true;
  try{const r=await fetch("dl/"+id+".bin");if(!r.ok||!r.body)throw 0;const tot=+r.headers.get("content-length")||f.sz,rd=r.body.getReader(),parts=[];let got=0;
    for(;;){const {done,value}=await rd.read();if(done)break;parts.push(value);got+=value.length;bt.innerHTML=`<b>Baixando… ${Math.min(99,Math.round(got*100/tot))}%</b>`}
    const all=new Uint8Array(got);let p=0;for(const c of parts){all.set(c,p);p+=c.length}
    bt.innerHTML="<b>Abrindo…</b>";
    const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:all.slice(0,12)},DLK,all.slice(12));
    const blob=new Blob([plain],{type:f.m}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=f.n;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    bt.innerHTML=txt.replace(/<span class="ok">.*?<\/span>/,"")+'<span class="ok">✓ Baixado</span>';
    if(DB) DB.collection("historico").add({acao:"baixou",cod:f.n,titulo:f.t,obra:f.o||"",nome:DLN,papel:"",em:new Date().toISOString(),doc:""}).catch(()=>{});
  }catch(_){bt.innerHTML=txt;toast("Não deu para baixar. Confira a internet e tente de novo.")}
  bt.disabled=false}
function dlItem(f){return `<button class="geral dlb" data-dl="${f.id}"><span class="ic">${f.g==="cad"?"CAD":"PDF"}</span><span><b>${esc(f.g==="cad"?f.t:obra(f.o)[0]+" "+obra(f.o)[1])}</b><span>${esc(f.g==="cad"?"Pranchas em DXF e PDF, todas as obras":f.t)} · ${mb(f.sz)}</span></span></button>`}
async function baixarPag(n){
  app.innerHTML=`<a class="voltar" href="${n?"#obra-"+n+"-docs":"#inicio"}">← ${n?"Voltar à obra":"Início"}</a><h1 style="font-size:2rem;margin-top:8px">Baixar projetos</h1><div id="dlc"><p class="aviso">Carregando…</p></div>`;
  let j;try{j=await dlLista()}catch(_){document.getElementById("dlc").innerHTML='<p class="aviso">Sem internet. Conecte para baixar os arquivos de projeto.</p>';return}
  const el=document.getElementById("dlc");if(!el)return;
  const pdf=j.f.filter(f=>f.g==="pdf"&&(!n||f.o===n)),cad=j.f.filter(f=>f.g==="cad");
  el.innerHTML=`<p style="color:var(--txt-2);margin:6px 4px 12px">${DLK?"Liberado para "+esc(DLN)+". Toque no arquivo para baixar.":"Só para quem tem senha. Toque no arquivo e digite nome e senha."} Plantas de posicionamento ficam de fora até a planta definitiva.</p>
   ${DLK?"":`<button class="pilula" id="dlent" style="margin-bottom:12px">Entrar com senha</button>`}
   <div class="secao"><h2>${n?"Projeto desta obra (PDF)":"Projeto por obra (PDF)"}</h2><div class="gerais">${pdf.map(dlItem).join("")||'<p class="aviso">Sem PDF para esta obra.</p>'}</div></div>
   <div class="secao"><h2>Arquivos CAD por disciplina</h2><div class="gerais">${cad.map(dlItem).join("")}</div></div>
   ${n?`<div class="secao"><a class="pilula clara" href="#baixar">Ver arquivos de todas as obras</a></div>`:""}
   <p class="aviso">Cada download fica registrado no histórico com o nome de quem baixou.</p>`;
  const en=document.getElementById("dlent");if(en)en.onclick=()=>dlLogin(()=>baixarPag(n));
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-dl]");if(!b)return;e.preventDefault();dlBaixar(b.dataset.dl,b)});
