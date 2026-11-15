/* ===== Extras do aplicativo ===== */
let BX={};
function ligaBaixas(){if(!DB)return;DB.collection("baixas").onSnapshot(s=>{const n={};s.docs.forEach(d=>{const v=d.data();(v&&v.itens||[]).forEach(k=>n[k]=v)});BX=n;
  const m=location.hash.match(/^#obra-(\d\d)-mat/);if(m&&!document.getElementById("mt")) rota()})}
setTimeout(()=>{const t=setInterval(()=>{if(DB){clearInterval(t);ligaBaixas()}},300)},300);
function parteHTML(n,p,filtro){
  let tot=0;const gs=p.g.map((g,gi)=>{const its=g[1].map((it,ii)=>[it,`${n}|${p.s}|${gi}|${ii}`]).filter(x=>!filtro||filtro(x[0]));tot+=its.length;
    return its.length?`<div class="sub">${esc(g[0])}</div>${its.map(([it,k])=>{const b=BX[k];return itemHTML(it).replace('<div class="it">',`<div class="it${b?" comprado":""}">`).replace(/<\/div>$/,b?`<span class="cp">✓ Comprado · NF ${esc(b.nf||"")} · ${dt(b.em)}</span></div>`:"</div>")}).join("")}`:""}).join("");
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
   <div style="font-weight:800;font-size:.9rem">3. Marcar os itens que chegaram</div>
   <div class="bx">${its.map(([i,k])=>`<label><input type="checkbox" value="${k}" ${BX[k]?"checked disabled":""}> <span>${esc(i[0])}</span><small>${esc(i[2])} ${esc(i[1])}</small></label>`).join("")}</div>
   <div class="campo"><i style="background:var(--folha)"></i><input id="tn" placeholder="Seu nome" value="${esc(nm)}" maxlength="60"></div>
   <button class="pilula" type="submit" id="tb">Dar baixa</button><button class="pilula clara" type="button" id="tx">Fechar</button>
   <p class="integra" style="margin:0">Fica salvo neste aparelho e vai para o sistema quando a integração estiver pronta.</p>
   <p id="te" hidden style="color:#DC2626;font-weight:800;margin:0;text-align:center"></p></form>`;
  document.body.appendChild(m);const $=id=>m.querySelector("#"+id);$("tx").onclick=()=>m.remove();
  $("bf").onchange=()=>{const f=$("bf").files[0];$("bfn").textContent=f?f.name:"1. Anexar foto ou PDF da nota fiscal"};
  m.querySelector("form").addEventListener("submit",async e=>{e.preventDefault();const sel=[...m.querySelectorAll(".bx input:checked:not(:disabled)")].map(x=>x.value),f=$("bf").files[0],nome=$("tn").value.trim();
    const er=t=>{$("te").textContent=t;$("te").hidden=false};
    if(!f) return er("Anexe a nota fiscal.");if(!$("bn").value.trim()) return er("Digite o número da nota.");if(!sel.length) return er("Marque pelo menos um item.");if(nome.length<2) return er("Digite seu nome.");
    try{localStorage.setItem("vr-tr-nome",nome)}catch(_){}
    const up=await AS.upload(f);await DB.collection("baixas").add({obra:n,parte:p.s,itens:sel,nf:$("bn").value.trim(),nome,asset:up.id,url:up.url,tipo:up.contentType,em:new Date().toISOString()});
    await DB.collection("historico").add({acao:"deu baixa (NF "+$("bn").value.trim()+")",cod:p.p,titulo:sel.length+" itens",obra:n,nome,papel:"",em:new Date().toISOString(),doc:""});
    m.remove();toast("Baixa registrada neste aparelho.");rota()});
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
