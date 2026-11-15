/* ===== Módulo Compras: pedido de cotação, orçamento do fornecedor, ordem de compra ===== */
let CMP=null,CMPN="",DRAFT=null,ST={},K2C=null;
{const st=document.createElement("style");st.textContent=`
.it .cod{display:block;font-size:.72rem;font-weight:800;color:var(--txt-2);letter-spacing:.02em;margin-top:2px}
.stc{display:inline-block;font-size:.7rem;font-weight:800;border-radius:99px;padding:2px 8px;margin:3px 0 0 0;background:var(--agua-claro);color:var(--terra-txt)}
.stc.orc{background:#FEF3C7;color:#92400E}.stc.oc{background:#DCFCE7;color:#166534}.stc.rec{background:#166534;color:#fff}
.cm-l{display:flex;flex-direction:column;gap:6px;padding:10px 0;border-top:1px solid var(--linha)}
.cm-l:first-child{border-top:0}.cm-l b{font-size:.92rem}.cm-l small{color:var(--txt-2);font-size:.75rem}
.cm-r{display:flex;align-items:center;gap:8px;font-size:.8rem}.cm-r code{font-weight:800;font-size:.75rem;flex:1;min-width:0}
.cm-r input,.cm-in{width:96px;font:inherit;font-weight:800;border:1.5px solid var(--linha);border-radius:10px;padding:7px 8px;background:var(--campo,var(--papel));color:var(--txt);text-align:right}
.cm-g{display:grid;grid-template-columns:1fr 1fr;gap:6px}.cm-g label{font-size:.72rem;font-weight:800;color:var(--txt-2);display:flex;flex-direction:column;gap:3px}
.cm-g input{width:100%;font:inherit;font-weight:700;border:1.5px solid var(--linha);border-radius:10px;padding:8px;background:var(--campo,var(--papel));color:var(--txt)}
.cm-f{display:flex;flex-direction:column;gap:4px;font-size:.8rem;font-weight:800;color:var(--txt-2)}
.cm-f input,.cm-f select,.cm-f textarea{font:inherit;font-weight:700;font-size:.95rem;border:1.5px solid var(--linha);border-radius:12px;padding:10px;background:var(--campo,var(--papel));color:var(--txt);width:100%}
.cm-ob{border:1px solid var(--linha);border-radius:14px;padding:10px 12px;background:var(--papel)}
.cm-ob summary{font-weight:800;cursor:pointer;display:flex;align-items:center;gap:8px;list-style:none}
.cm-ob label{display:flex;gap:8px;align-items:center;padding:5px 0;font-size:.9rem}
.cm-x{border:0;background:none;color:#DC2626;font-weight:900;font-size:1.1rem;cursor:pointer;padding:0 4px}
.cm-min{background:#DCFCE7;color:#166534;border-radius:6px;padding:0 4px;font-weight:900}
.cm-card{display:flex;justify-content:space-between;gap:10px;align-items:center;text-decoration:none;color:inherit;padding:12px 0;border-top:1px solid var(--linha)}
.cm-card:first-of-type{border-top:0}.cm-card b{display:block}.cm-card small{color:var(--txt-2)}
`;document.head.appendChild(st)}
const nBR=(v,d=3)=>Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:d});
const qBR=v=>Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:3,maximumFractionDigits:3});
const rBR=v=>"R$ "+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const pnum=s=>{s=String(s==null?"":s).trim();if(!s)return 0;if(/,/.test(s))s=s.replace(/\./g,"").replace(",",".");else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,"");const v=parseFloat(s);return isFinite(v)?v:0};
const ddmmaa=(d=new Date())=>String(d.getDate()).padStart(2,"0")+String(d.getMonth()+1).padStart(2,"0")+String(d.getFullYear()).slice(2);
const dLong=s=>new Date(s).toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"});
function k2c(){if(K2C)return K2C;K2C={};Object.entries(D.mat).forEach(([n,ps])=>ps.forEach(p=>p.g.forEach((g,gi)=>g[1].forEach((it,ii)=>{K2C[`${n}|${p.s}|${gi}|${ii}`]=it[4]}))));return K2C}
const sigDe=c=>(c||"").split("-")[2]||"";
const rotC=r=>`${r.c} (${obra(r.o)[1]} · ${D.sigNome[sigDe(r.c)]||""})`;

/* --- trava --- */
async function cmpAbrir(pw){const e=await (await fetch("cmp.enc.json",{cache:"no-store"})).json();
  const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw.trim().toLowerCase()),"PBKDF2",false,["deriveKey"]);
  const k=await crypto.subtle.deriveKey({name:"PBKDF2",salt:b64u(e.s),iterations:e.it,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["decrypt"]);
  let pt;try{pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64u(e.iv)},k,b64u(e.ct))}catch(_){throw new Error("senha")}
  const c=JSON.parse(new TextDecoder().decode(pt));
  try{const extra=JSON.parse(localStorage.getItem("vr-cmp-forn")||"[]");extra.forEach(f=>{const i=c.fornecedores.findIndex(x=>x.nome===f.nome);if(i>=0)c.fornecedores[i]=f;else c.fornecedores.push(f)})}catch(_){}
  return c}
function cmpLogin(depois){let nm="";try{nm=localStorage.getItem("vr-tr-nome")||""}catch(_){}
  const m=document.createElement("div");m.id="mt";m.className="modal";
  m.innerHTML=`<form class="login" style="margin:0;width:100%"><h1 style="font-size:1.4rem">Compras</h1><p>Cotações e ordens de compra. Digite seu nome e a senha de Compras.</p>
   <div class="campo"><i style="background:var(--folha)"></i><input id="tn" placeholder="Seu nome" value="${esc(nm)}" maxlength="60" autocomplete="name"></div>
   <div class="campo"><i style="background:var(--terra)"></i><input id="ts" type="password" placeholder="Senha de Compras" autocomplete="current-password"></div>
   <button class="pilula" type="submit" id="tb">Entrar</button><button class="pilula clara" type="button" id="tx">Fechar</button>
   <p id="te" hidden style="color:#DC2626;font-weight:800;margin:0;text-align:center"></p></form>`;
  document.body.appendChild(m);const $=id=>m.querySelector("#"+id);$("tx").onclick=()=>{m.remove();location.hash="compras"};setTimeout(()=>$(nm?"ts":"tn").focus(),50);
  m.querySelector("form").addEventListener("submit",async e=>{e.preventDefault();const nome=$("tn").value.trim(),er=t=>{$("te").textContent=t;$("te").hidden=false};
    if(nome.length<2) return er("Digite seu nome.");if(!$("ts").value) return er("Digite a senha.");
    $("tb").disabled=true;$("tb").textContent="Conferindo…";
    try{CMP=await cmpAbrir($("ts").value);CMPN=nome;try{localStorage.setItem("vr-tr-nome",nome)}catch(_){}m.remove();depois&&depois()}
    catch(x){$("tb").disabled=false;$("tb").textContent="Entrar";er(x&&x.message==="senha"?"Senha errada.":"Não foi possível abrir. Tente de novo.")}});
}
function cmpTopo(t,volta="#cmp"){return `<a class="voltar" href="${volta}">← ${volta==="#cmp"?"Cotações e ordens":volta==="#compras"?"Compras da obra":"Voltar"}</a><h1 style="font-size:1.8rem;margin-top:8px">${t}</h1>`}
async function cmpRota(sub){
  if(!CMP){app.innerHTML=cmpTopo("Cotações e ordens de compra","#compras")+`<section class="bloco"><p style="margin:0">Área de Compras com senha. Sem senha, a lista de material continua aberta só para consulta, sem preço.</p><button class="pilula" id="cmpent">Entrar</button></section>`;
    document.getElementById("cmpent").onclick=()=>cmpLogin(()=>cmpRota(sub));cmpLogin(()=>cmpRota(sub));return}
  let m;
  if(!sub) return cmpHome();
  if(sub==="nova") return cmpNova();
  if(sub==="rev") return cmpRev();
  if(sub==="forn") return cmpForn();
  if(sub==="gerar") return cmpHome("gerar");
  if(sub==="ordens") return cmpHome("ordens");
  if((m=sub.match(/^c-(.+)$/))) return cmpCot(m[1]);
  if((m=sub.match(/^o-(.+)$/))) return cmpOrc(m[1]);
  if((m=sub.match(/^g-(.+)$/))) return cmpGerar(m[1]);
  if((m=sub.match(/^oc-(.+)$/))) return cmpOC(m[1]);
  cmpHome();
}
const colDocs=async c=>(await DB.collection(c).get()).docs.map(d=>({id:d.id,...d.data()}));
async function proxNum(c){if(window.API&&API.numero){const s=await API.numero(c);if(s)return s}let mx=(CMP.seqBase||{})[c]||0;(await colDocs(c)).forEach(v=>{if(v.num)mx=Math.max(mx,parseInt(v.num.split("-")[1])||0)});return ddmmaa()+"-"+String(mx+1).padStart(2,"0")}
async function hist(acao,cod,titulo){try{await DB.collection("historico").add({acao,cod,titulo,obra:"",nome:CMPN,papel:"Compras",em:new Date().toISOString(),doc:""})}catch(_){}}

/* --- início --- */
const ocSit=o=>o.status==="liberada"?'<span class="stc oc">liberada</span>':'<span class="stc orc">pendente de liberação</span>';
async function cmpHome(aba="cot"){
  const T=[["cot","Cotações","#cmp"],["gerar","Gerar ordem de compra","#cmp-gerar"],["ordens","Ordens de compra","#cmp-ordens"]];
  app.innerHTML=cmpTopo("Compras","#compras")+`<p style="color:var(--txt-2);margin:4px 4px 10px">Entrou: <b>${esc(CMPN)}</b>. O app gera o PDF e você envia ao fornecedor.</p>
  <nav class="abas" style="display:flex;gap:8px;overflow-x:auto;margin-bottom:12px">${T.map(t=>`<a class="${t[0]===aba?"pilula":"pilula clara"}" style="flex:none;width:auto;padding:10px 16px" href="${t[2]}">${t[1]}</a>`).join("")}</nav><div id="cx"><p class="vazio">Carregando…</p></div>
  <p class="integra">Fica salvo neste aparelho e vai para o sistema quando a integração estiver pronta.</p>`;
  const [cs,os,ors]=await Promise.all([colDocs("cotacoes"),colDocs("ocs"),colDocs("orcamentos")]);
  cs.sort((a,b)=>b.em.localeCompare(a.em));os.sort((a,b)=>b.em.localeCompare(a.em));const cx=document.getElementById("cx");if(!cx)return;
  const ocCard=o=>`<a class="cm-card" href="#cmp-oc-${o.id}"><span><b>OC ${esc(o.num)} · ${esc(o.forn.nome)}</b><small>${esc(o.titulo||"")} · ${dt(o.em)}</small><br>${ocSit(o)}</span><span class="money" style="font-weight:900">${rBR(o.total)}</span></a>`;
  if(aba==="cot") cx.innerHTML=`<a class="pilula" href="#cmp-nova">+ Novo pedido de cotação</a><section class="bloco" style="margin-top:12px"><h2>Pedidos de cotação</h2>${cs.map(c=>{const no=ors.filter(o=>o.cot===c.id).length,nc=os.filter(o=>o.cot===c.id).length;
    return `<a class="cm-card" href="#cmp-c-${c.id}"><span><b>COT ${esc(c.num)} · ${esc(c.titulo||"")}</b><small>${c.linhas.length} linhas · ${dt(c.em)} · ${no} orçamento(s)${nc?" · "+nc+" OC":""}</small></span><span>›</span></a>`}).join("")||'<p class="vazio">Nenhum pedido de cotação ainda.</p>'}</section>
    <div class="secao" style="margin-top:12px"><a class="pilula clara" href="#cmp-forn">Fornecedores</a></div>`;
  if(aba==="gerar") cx.innerHTML=`<p style="color:var(--txt-2);margin:0 4px 10px">1. Anexe o orçamento do fornecedor no pedido de cotação. 2. Confira e toque em Gerar. 3. A ordem fica pendente até ser liberada com a senha de liberação; só depois dá para baixar.</p>
    <section class="bloco"><h2>Pedidos de cotação</h2>${cs.map(c=>{const no=ors.filter(o=>o.cot===c.id).length;
    return `<div class="cm-card"><span><b>COT ${esc(c.num)} · ${esc(c.titulo||"")}</b><small>${no?no+" orçamento(s) anexado(s)":"sem orçamento anexado"}</small></span>${no?`<a class="mini" href="#cmp-g-${c.id}">Gerar OC</a>`:`<a class="mini clara" href="#cmp-o-${c.id}">Anexar orçamento</a>`}</div>`}).join("")||'<p class="vazio">Crie um pedido de cotação primeiro.</p>'}</section>
    ${os.filter(o=>o.status!=="liberada").length?`<section class="bloco" style="margin-top:12px"><h2>Pendentes de liberação</h2>${os.filter(o=>o.status!=="liberada").map(ocCard).join("")}</section>`:""}`;
  if(aba==="ordens") cx.innerHTML=`<section class="bloco"><h2>Ordens de compra</h2>${os.map(ocCard).join("")||'<p class="vazio">Nenhuma ordem de compra ainda.</p>'}</section>`;
}

/* --- novo pedido: escolher partes --- */
function cmpNova(){
  const obs=D.obras.filter(o=>(D.mat[o[0]]||[]).length);
  const sigs=[...new Set(Object.values(D.mat).flatMap(ps=>ps.map(p=>p.g[0]&&p.g[0][1][0]?sigDe(p.g[0][1][0][4]):"")))].filter(Boolean).sort();
  app.innerHTML=cmpTopo("Novo pedido de cotação")+`<p style="color:var(--txt-2);margin:4px 4px 10px">1. Escolha o que entra: uma parte, a obra inteira ou tudo de uma vez. No próximo passo você ajusta as quantidades.</p>
  <div class="chips" style="margin-bottom:8px"><button class="chip" id="ctudo">Tudo de uma vez</button><button class="chip" id="climpa">Limpar</button></div>
  <details class="cm-ob" style="margin-bottom:8px"><summary>Marcar por tipo de parte (todas as obras)</summary><div class="chips" style="margin-top:8px">${sigs.map(s=>`<button class="chip" data-sg="${s}">${s} · ${esc(D.sigNome[s]||"")}</button>`).join("")}</div></details>
  <div style="display:flex;flex-direction:column;gap:8px">${obs.map(o=>`<details class="cm-ob"><summary><input type="checkbox" data-ob="${o[0]}"> ${o[0]} ${esc(o[1])} <small style="margin-left:auto;color:var(--txt-2)">${nItens(o[0])} itens</small></summary>
    ${D.mat[o[0]].map(p=>{const n=p.g.reduce((a,g)=>a+g[1].length,0),sg=sigDe(p.g[0]&&p.g[0][1][0]&&p.g[0][1][0][4]);return `<label><input type="checkbox" data-pt="${o[0]}|${p.s}" data-sgp="${sg}"> ${esc(p.p)} <small style="color:var(--txt-2)">· ${sg} · ${n} itens</small></label>`}).join("")}</details>`).join("")}</div>
  <label style="display:flex;gap:8px;align-items:center;margin:14px 4px;font-weight:800"><input type="checkbox" id="cagr" checked> Juntar itens iguais de obras diferentes numa linha só (rateio na OBS)</label>
  <p id="ccont" style="font-weight:800;margin:0 4px 10px"></p><button class="pilula" id="cseg">Continuar</button>`;
  const pts=[...app.querySelectorAll("[data-pt]")],cont=()=>{const sel=pts.filter(x=>x.checked);let n=0;sel.forEach(x=>{const [o,s]=x.dataset.pt.split("|");const p=D.mat[o].find(q=>q.s===s);n+=p.g.reduce((a,g)=>a+g[1].length,0)});
    document.getElementById("ccont").textContent=`${sel.length} parte(s) · ${n} itens`;app.querySelectorAll("[data-ob]").forEach(ob=>{const ps=pts.filter(x=>x.dataset.pt.startsWith(ob.dataset.ob+"|"));ob.checked=ps.every(x=>x.checked);ob.indeterminate=!ob.checked&&ps.some(x=>x.checked)})};
  app.querySelectorAll("[data-ob]").forEach(ob=>{ob.addEventListener("click",e=>e.stopPropagation());ob.addEventListener("change",()=>{pts.filter(x=>x.dataset.pt.startsWith(ob.dataset.ob+"|")).forEach(x=>x.checked=ob.checked);cont()})});
  pts.forEach(x=>x.addEventListener("change",cont));
  document.getElementById("ctudo").onclick=()=>{pts.forEach(x=>x.checked=true);cont()};document.getElementById("climpa").onclick=()=>{pts.forEach(x=>x.checked=false);cont()};
  app.querySelectorAll("[data-sg]").forEach(b=>b.onclick=()=>{const al=pts.filter(x=>x.dataset.sgp===b.dataset.sg),on=!al.every(x=>x.checked);al.forEach(x=>x.checked=on);cont()});
  if(DRAFT&&DRAFT.sel) pts.forEach(x=>x.checked=DRAFT.sel.includes(x.dataset.pt));cont();
  document.getElementById("cseg").onclick=()=>{const sel=pts.filter(x=>x.checked).map(x=>x.dataset.pt);if(!sel.length) return toast("Marque pelo menos uma parte.");
    const agr=document.getElementById("cagr").checked,map=new Map(),linhas=[];
    sel.forEach(pt=>{const [o,s]=pt.split("|");const p=D.mat[o].find(q=>q.s===s);p.g.forEach((g,gi)=>g[1].forEach((it,ii)=>{
      const r={c:it[4],k:`${o}|${s}|${gi}|${ii}`,o,q:pnum(it[2]),sq:pnum(it[2])},key=norm(it[0])+"|"+it[1];
      if(agr&&map.has(key)) map.get(key).r.push(r);else{const l={d:it[0],u:it[1],r:[r]};linhas.push(l);if(agr)map.set(key,l)}}))});
    const obsSel=[...new Set(sel.map(x=>x.split("|")[0]))],ptsSel=[...new Set(sel.map(x=>{const [o,s]=x.split("|");return D.mat[o].find(q=>q.s===s).p}))];
    DRAFT={sel,agr,linhas,titulo:ptsSel.length<=3?ptsSel.join(", "):"Materiais diversos",destino:obsSel.length===obsSel.length&&obsSel.length<=3?obsSel.map(o=>obra(o)[1]).join(", "):obsSel.length+" obras do complexo",prazo:""};
    location.hash="cmp-rev"};
}
/* --- revisar quantidades --- */
function cmpRev(){
  if(!DRAFT) return location.hash="cmp-nova";
  const L=DRAFT.linhas;
  app.innerHTML=cmpTopo("Revisar pedido de cotação","#cmp-nova")+`<p style="color:var(--txt-2);margin:4px 4px 10px">2. A quantidade vem da lista como sugestão: mude à vontade. Quantidade zero ou ✕ tira o item.</p>
  <section class="bloco"><div class="cm-f">Assunto<input id="rt" value="${esc(DRAFT.titulo)}" maxlength="120"></div><div class="cm-f">Destino<input id="rd" value="${esc(DRAFT.destino)}" maxlength="160"></div>
  <div class="cm-f">Prazo para resposta<input id="rp" placeholder="ex.: 20/11/2026" value="${esc(DRAFT.prazo)}" maxlength="40"></div></section>
  <div class="busca" style="margin-top:12px">${LUPA}<input id="rq" type="search" placeholder="Filtrar itens" autocomplete="off"></div>
  <section class="bloco" style="margin-top:10px;gap:0" id="rl"></section>
  <p id="rcont" style="font-weight:800;margin:10px 4px"></p><button class="pilula" id="rger">Gerar pedido de cotação</button>`;
  const rl=document.getElementById("rl"),rq=document.getElementById("rq");let lim=200;
  const tot=l=>l.r.reduce((a,r)=>a+(+r.q||0),0);
  const conta=()=>{const v=L.filter(l=>tot(l)>0);document.getElementById("rcont").textContent=`${v.length} linhas no pedido`};
  const desenha=()=>{const t=norm(rq.value).trim();const vis=L.map((l,i)=>[l,i]).filter(([l])=>!l._x&&(!t||norm(l.d+" "+l.r.map(r=>r.c).join(" ")).includes(t)));
    rl.innerHTML=vis.slice(0,lim).map(([l,i])=>`<div class="cm-l" data-i="${i}"><div style="display:flex;gap:6px;align-items:flex-start"><b style="flex:1">${esc(l.d)}</b><button class="cm-x" data-x="${i}" aria-label="Tirar">✕</button></div>
      ${l.r.map((r,j)=>`<div class="cm-r"><code>${esc(rotC(r))}</code><input inputmode="decimal" data-q="${i}|${j}" value="${nBR(r.q)}"><small>${esc(l.u)}</small></div>`).join("")}
      ${l.r.length>1?`<small>Total da linha: <b data-t="${i}">${nBR(tot(l))}</b> ${esc(l.u)}</small>`:""}</div>`).join("")+(vis.length>lim?`<button class="pilula clara" id="rmais" style="margin-top:10px">Mostrar mais (${vis.length-lim})</button>`:"")||'<p class="vazio">Nenhum item.</p>';
    const mm=document.getElementById("rmais");if(mm)mm.onclick=()=>{lim+=300;desenha()};conta()};
  rl.addEventListener("input",e=>{const q=e.target.dataset.q;if(!q)return;const [i,j]=q.split("|").map(Number);L[i].r[j].q=pnum(e.target.value);const t=rl.querySelector(`[data-t="${i}"]`);if(t)t.textContent=nBR(tot(L[i]));conta()});
  rl.addEventListener("click",e=>{const x=e.target.closest("[data-x]");if(!x)return;L[+x.dataset.x]._x=true;desenha()});
  rq.addEventListener("input",()=>{lim=200;desenha()});desenha();
  ["rt","rd","rp"].forEach(id=>document.getElementById(id).addEventListener("input",e=>{DRAFT[{rt:"titulo",rd:"destino",rp:"prazo"}[id]]=e.target.value}));
  document.getElementById("rger").onclick=async e=>{const linhas=L.filter(l=>!l._x).map(l=>({d:l.d,u:l.u,r:l.r.filter(r=>+r.q>0).map(r=>({c:r.c,k:r.k,o:r.o,q:+r.q}))})).filter(l=>l.r.length);
    if(!linhas.length) return toast("Nenhum item com quantidade.");e.target.disabled=true;
    const num=await proxNum("cotacoes"),em=new Date().toISOString();
    const d=await DB.collection("cotacoes").add({num,titulo:DRAFT.titulo.trim(),destino:DRAFT.destino.trim(),prazo:DRAFT.prazo.trim(),agr:DRAFT.agr,linhas,nome:CMPN,em});
    await hist("criou pedido de cotação","COT "+num,linhas.length+" linhas");DRAFT=null;await cmpStatus();location.hash="cmp-c-"+d.id};
}
/* --- pedido de cotação: detalhe --- */
async function cmpCot(id){
  const s=await DB.collection("cotacoes").doc(id).get();if(!s.exists){app.innerHTML=cmpTopo("Pedido não encontrado");return}
  const c={id,...s.data()},ors=(await colDocs("orcamentos")).filter(o=>o.cot===id).sort((a,b)=>a.em.localeCompare(b.em)),ocs=(await colDocs("ocs")).filter(o=>o.cot===id);
  const totF=o=>c.linhas.reduce((a,l,i)=>{const p=(o.precos||[])[i];return a+(p&&p.pu>0?p.pu*l.r.reduce((x,r)=>x+r.q,0):0)},0);
  app.innerHTML=cmpTopo("COT "+esc(c.num))+`<p style="color:var(--txt-2);margin:4px 4px 12px">${esc(c.titulo)} · Destino: ${esc(c.destino)} · ${c.linhas.length} linhas · ${dt(c.em)} · ${esc(c.nome)}</p>
  <section class="bloco"><h2>Gerar PDF para enviar</h2><div class="cm-f">Fornecedor no PDF<select id="cf"><option value="">Em branco (preencher depois)</option>${CMP.fornecedores.map((f,i)=>`<option value="${i}">${esc(f.nome)}</option>`).join("")}</select></div>
   <button class="pilula" id="cpdf">PDF do pedido de cotação</button><button class="pilula clara" id="ccsv">Planilha para o fornecedor preencher (CSV)</button></section>
  <section class="bloco" style="margin-top:12px"><h2>Orçamentos recebidos</h2>${ors.map(o=>`<div class="cm-card"><span><b>${esc(o.forn.nome)}</b><small>Proposta ${esc(o.prop||"-")} · ${o.precos.filter(p=>p&&p.pu>0).length}/${c.linhas.length} itens com preço · ${dt(o.em)}${o.url?` · <a href="${o.url}" target="_blank">ver anexo</a>`:""}</small></span><span class="money" style="font-weight:900">${rBR(totF(o))}</span></div>`).join("")||'<p class="vazio">Nenhum ainda.</p>'}
   <a class="pilula clara" href="#cmp-o-${id}">+ Anexar orçamento do fornecedor</a></section>
  ${ors.length?`<section class="bloco" style="margin-top:12px"><h2>Comparativo</h2><div id="ccmp"></div></section>`:""}
  <section class="bloco" style="margin-top:12px"><h2>Ordem de compra</h2>${ocs.map(o=>`<a class="cm-card" href="#cmp-oc-${o.id}"><span><b>OC ${esc(o.num)} · ${esc(o.forn.nome)}</b><small>${dt(o.em)}</small><br>${ocSit(o)}</span><span class="money" style="font-weight:900">${rBR(o.total)}</span></a>`).join("")}
   ${ors.length?`<a class="pilula verde" href="#cmp-g-${id}">Gerar ordem de compra</a>`:'<p class="integra" style="margin:0">A ordem de compra só sai depois de anexar o orçamento do fornecedor.</p>'}</section>`;
  if(ors.length){let lim=60;const el=document.getElementById("ccmp"),dr=()=>{el.innerHTML=c.linhas.slice(0,lim).map((l,i)=>{const q=l.r.reduce((a,r)=>a+r.q,0),ps=ors.map(o=>(o.precos||[])[i]).map(p=>p&&p.pu>0?p.pu:null),mn=Math.min(...ps.filter(x=>x!=null));
      return `<div class="cm-l"><b>${esc(l.d)}</b><small>${nBR(q)} ${esc(l.u)}</small>${ors.map((o,j)=>`<div class="cm-r"><span style="flex:1">${esc(o.forn.nome)}</span><span class="${ps[j]!=null&&ps[j]===mn&&ors.length>1?"cm-min":""}">${ps[j]!=null?rBR(ps[j]):"sem preço"}</span></div>`).join("")}</div>`}).join("")+
      `<div class="cm-l">${ors.map(o=>`<div class="cm-r"><b style="flex:1">Total ${esc(o.forn.nome)}</b><b>${rBR(totF(o))}</b></div>`).join("")}</div>`+(c.linhas.length>lim?`<button class="pilula clara" id="cmm">Mostrar mais</button>`:"");
      const b=document.getElementById("cmm");if(b)b.onclick=()=>{lim+=200;dr()}};dr()}
  document.getElementById("cpdf").onclick=async e=>{e.target.disabled=true;e.target.textContent="Gerando PDF…";const fi=document.getElementById("cf").value;
    try{const f=await pdfCot(c,fi===""?null:CMP.fornecedores[+fi]);entregaArq(f)}catch(x){console.error(x);toast("Não deu para gerar o PDF.")}e.target.disabled=false;e.target.textContent="PDF do pedido de cotação"};
  document.getElementById("ccsv").onclick=()=>entregaArq(csvCot(c));
}
function csvCot(c){const q=s=>'"'+String(s==null?"":s).replace(/"/g,'""')+'"';
  const rows=[["Linha","Descrição","Unid.","Quant.","OBS (códigos Villa Rica)","Código do fornecedor","Preço unitário (R$)","ICMS %","IPI %"]];
  c.linhas.forEach((l,i)=>rows.push([i+1,l.d,l.u,nBR(l.r.reduce((a,r)=>a+r.q,0)),l.r.map(r=>r.c+(l.r.length>1?": "+nBR(r.q)+" "+l.u:"")).join("; "),"","","",""]));
  return new File(["﻿"+rows.map(r=>r.map(q).join(";")).join("\r\n")],`Pedido de cotacao COT ${c.num} - Villa Rica.csv`,{type:"text/csv"})}
function entregaArq(f){const m=document.createElement("div");m.id="mt2";m.className="modal";
  m.innerHTML=`<div class="login" style="margin:0;width:100%"><h1 style="font-size:1.3rem">Arquivo pronto</h1><p style="word-break:break-word">${esc(f.name)}</p>
   ${navigator.canShare&&navigator.canShare({files:[f]})?'<button class="pilula" id="esh">Enviar (WhatsApp, e-mail…)</button>':""}<button class="pilula clara" id="esv">Salvar / abrir</button><button class="pilula clara" id="ex">Fechar</button></div>`;
  document.body.appendChild(m);const g=id=>m.querySelector("#"+id);g("ex").onclick=()=>m.remove();
  if(g("esh"))g("esh").onclick=()=>navigator.share({files:[f],title:f.name}).catch(()=>{});
  g("esv").onclick=()=>{const u=URL.createObjectURL(f),a=document.createElement("a");a.href=u;a.download=f.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000)}}
/* --- anexar orçamento --- */
async function cmpOrc(id){
  const s=await DB.collection("cotacoes").doc(id).get();if(!s.exists)return cmpHome();const c={id,...s.data()};
  app.innerHTML=cmpTopo("Orçamento do fornecedor","#cmp-c-"+id)+`<p style="color:var(--txt-2);margin:4px 4px 12px">COT ${esc(c.num)} · ${esc(c.titulo)}</p>
  <section class="bloco"><div class="cm-f">Fornecedor<select id="of"><option value="">Escolher…</option>${CMP.fornecedores.map((f,i)=>`<option value="${i}">${esc(f.nome)}</option>`).join("")}<option value="novo">+ Novo fornecedor</option></select></div>
   <div id="onovo" hidden class="cm-g">${[["nome","Razão social"],["cnpj","CNPJ"],["end","Endereço"],["cidade","Cidade – UF · CEP"],["ac","A/C (contato)"],["email","E-mail / telefone"],["cliente","Nosso nº de cliente"]].map(([k,t])=>`<label>${t}<input data-fn="${k}"></label>`).join("")}</div>
   <div class="cm-g"><label>Nº da proposta<input id="op"></label><label>Data da proposta<input id="od" placeholder="dd/mm/aaaa"></label></div>
   <label class="arq"><input id="oa" type="file" accept="application/pdf,image/*"><span id="oan">Anexar orçamento (PDF ou foto) – obrigatório</span></label>
   <div class="cm-g"><label>Pagamento<input id="pf" value="Boleto bancário"></label><label>Nº de parcelas<input id="pn" inputmode="numeric" value="1"></label><label>Vencimentos (dias)<input id="pv" value="30" placeholder="30, 60, 90"></label><label>Frete<input id="pfr" value="CIF – entrega na obra"></label></div>
   <div class="cm-f">ICMS/IPI – observação para a OC<input id="pobs" placeholder="ex.: ICMS incluso no preço (18%). IPI 0%."></div>
   <label class="arq"><input id="oc" type="file" accept=".csv,text/csv"><span>Importar planilha preenchida pelo fornecedor (CSV) – opcional</span></label></section>
  <section class="bloco" style="margin-top:12px;gap:0"><h2 style="margin-bottom:8px">Preços por item</h2>${c.linhas.map((l,i)=>`<div class="cm-l"><b>${i+1}. ${esc(l.d)}</b><small>${nBR(l.r.reduce((a,r)=>a+r.q,0))} ${esc(l.u)} · ${esc(l.r.map(r=>r.c).join(", "))}</small>
    <div class="cm-g"><label>Preço unit. (R$)<input inputmode="decimal" data-p="${i}|pu"></label><label>Cód. fornecedor<input data-p="${i}|cf"></label><label>ICMS %<input inputmode="decimal" data-p="${i}|icms"></label><label>IPI %<input inputmode="decimal" data-p="${i}|ipi"></label></div></div>`).join("")}</section>
  <p id="oe" hidden style="color:#DC2626;font-weight:800;margin:10px 4px"></p><button class="pilula" id="osv" style="margin-top:10px">Salvar orçamento</button>`;
  const g=x=>document.getElementById(x);g("of").onchange=()=>{g("onovo").hidden=g("of").value!=="novo"};g("oa").onchange=()=>{const f=g("oa").files[0];g("oan").textContent=f?f.name:"Anexar orçamento"};
  g("oc").onchange=async()=>{const f=g("oc").files[0];if(!f)return;const t=await f.text(),sep=t.split("\n")[0].includes(";")?";":",";let n=0;
    const cel=line=>{const o=[];let cur="",inq=false;for(let i=0;i<line.length;i++){const ch=line[i];if(inq){if(ch=='"'&&line[i+1]=='"'){cur+='"';i++}else if(ch=='"')inq=false;else cur+=ch}else if(ch=='"')inq=true;else if(ch===sep){o.push(cur);cur=""}else cur+=ch}o.push(cur);return o};
    t.replace(/^﻿/,"").split(/\r?\n/).slice(1).forEach(ln=>{const c2=cel(ln),i=parseInt(c2[0])-1;if(!(i>=0&&i<c.linhas.length))return;
      const set=(k,v)=>{const el=app.querySelector(`[data-p="${i}|${k}"]`);if(el&&v!=null&&String(v).trim()!=="")el.value=String(v).trim()};set("cf",c2[5]);set("pu",c2[6]);set("icms",c2[7]);set("ipi",c2[8]);if(c2[6]&&c2[6].trim())n++});
    toast(n+" preços importados.")};
  g("osv").onclick=async()=>{const er=t=>{g("oe").textContent=t;g("oe").hidden=false};let forn;
    if(g("of").value==="novo"){forn={};app.querySelectorAll("[data-fn]").forEach(x=>forn[x.dataset.fn]=x.value.trim());if(!forn.nome)return er("Digite a razão social do fornecedor.");
      CMP.fornecedores.push(forn);try{const ex=JSON.parse(localStorage.getItem("vr-cmp-forn")||"[]");ex.push(forn);localStorage.setItem("vr-cmp-forn",JSON.stringify(ex))}catch(_){}}
    else if(g("of").value!=="") forn=CMP.fornecedores[+g("of").value];else return er("Escolha o fornecedor.");
    const f=g("oa").files[0];if(!f) return er("Anexe o orçamento do fornecedor (PDF ou foto).");
    const precos=c.linhas.map((l,i)=>{const v=k=>{const el=app.querySelector(`[data-p="${i}|${k}"]`);return el?el.value.trim():""};return{pu:pnum(v("pu")),cf:v("cf"),icms:pnum(v("icms")),ipi:pnum(v("ipi"))}});
    if(!precos.some(p=>p.pu>0)) return er("Digite o preço de pelo menos um item.");
    g("osv").disabled=true;const up=await AS.upload(f);
    await DB.collection("orcamentos").add({cot:id,cotNum:c.num,forn,prop:g("op").value.trim(),data:g("od").value.trim(),asset:up.id,url:up.url,tipo:up.contentType,
      pag:{forma:g("pf").value.trim(),parc:Math.max(1,parseInt(g("pn").value)||1),venc:g("pv").value.trim()},frete:g("pfr").value.trim(),obs:g("pobs").value.trim(),precos,nome:CMPN,em:new Date().toISOString()});
    await hist("anexou orçamento","COT "+c.num,forn.nome);await cmpStatus();toast("Orçamento salvo.");location.hash="cmp-c-"+id};
}
/* --- gerar ordem de compra --- */
async function cmpGerar(id){
  const s=await DB.collection("cotacoes").doc(id).get();if(!s.exists)return cmpHome();const c={id,...s.data()};
  const ors=(await colDocs("orcamentos")).filter(o=>o.cot===id);if(!ors.length) return location.hash="cmp-c-"+id;
  app.innerHTML=cmpTopo("Gerar ordem de compra","#cmp-c-"+id)+`<p style="color:var(--txt-2);margin:4px 4px 12px">COT ${esc(c.num)} · ${esc(c.titulo)}</p>
  <section class="bloco"><div class="cm-f">Como comprar<select id="gm"><option value="menor">Menor preço por item (uma OC por fornecedor)</option>${ors.map((o,i)=>`<option value="${i}">Tudo com ${esc(o.forn.nome)}</option>`).join("")}</select></div>
   <div class="cm-f">Assunto<input id="ga" value="${esc(c.titulo)}"></div><div class="cm-f">Destino<input id="gd" value="${esc(c.destino)}"></div></section>
  <section class="bloco" style="margin-top:12px"><h2>Prévia</h2><div id="gp"></div></section><p class="integra">Depois de gerada, a ordem fica pendente de liberação. Só a senha de liberação libera o download.</p><button class="pilula verde" id="gok" style="margin-top:12px">Gerar ordem de compra</button>`;
  const monta=()=>{const m=document.getElementById("gm").value,por=new Map();
    c.linhas.forEach((l,i)=>{let best=null;ors.forEach((o,j)=>{const p=(o.precos||[])[i];if(!p||!(p.pu>0))return;if(m!=="menor"&&String(j)!==m)return;if(!best||p.pu<best.p.pu)best={j,p}});
      if(!best)return;if(!por.has(best.j))por.set(best.j,[]);const q=l.r.reduce((a,r)=>a+r.q,0);por.get(best.j).push({d:l.d,u:l.u,q,pu:best.p.pu,icms:best.p.icms,ipi:best.p.ipi,cf:best.p.cf,r:l.r,tot:Math.round(best.p.pu*q*100)/100})});return por};
  const pv=()=>{const por=monta();document.getElementById("gp").innerHTML=[...por].map(([j,its])=>`<div class="cm-card"><span><b>${esc(ors[j].forn.nome)}</b><small>${its.length} itens</small></span><b>${rBR(its.reduce((a,x)=>a+x.tot,0))}</b></div>`).join("")||'<p class="vazio">Nenhum item com preço.</p>'};
  document.getElementById("gm").onchange=pv;pv();
  document.getElementById("gok").onclick=async e=>{const por=monta();if(!por.size)return toast("Nenhum item com preço.");e.target.disabled=true;let k=0,last=null;
    for(const [j,its] of por){const o=ors[j],num=await proxNum("ocs");
      const d=await DB.collection("ocs").add({status:"pendente",num,cot:id,cotNum:c.num,orc:o.id,forn:o.forn,prop:o.prop,propData:o.data,pag:o.pag,frete:o.frete,obsImp:o.obs,titulo:document.getElementById("ga").value.trim(),destino:document.getElementById("gd").value.trim(),itens:its,total:its.reduce((a,x)=>a+x.tot,0),nome:CMPN,em:new Date().toISOString()});
      await hist("gerou ordem de compra","OC "+num,o.forn.nome);last=d.id;k++}
    await cmpStatus();toast(k>1?k+" ordens geradas, pendentes de liberação.":"Ordem gerada, pendente de liberação.");location.hash=k>1?"cmp-gerar":"cmp-oc-"+last};
}
async function cmpOC(id){
  const s=await DB.collection("ocs").doc(id).get();if(!s.exists)return cmpHome();const o={id,...s.data()};
  const lib=o.status==="liberada";
  app.innerHTML=cmpTopo("OC "+esc(o.num),lib?"#cmp-ordens":"#cmp-gerar")+`<p style="color:var(--txt-2);margin:4px 4px 8px">${esc(o.forn.nome)} · ${esc(o.titulo)} · gerada por ${esc(o.nome)} em ${dt(o.em)}</p><p style="margin:0 4px 12px">${ocSit(o)}${lib?` <small style="color:var(--txt-2)">por ${esc(o.libNome)} em ${dt(o.libEm)}</small>`:""}</p>
  <section class="bloco">${lib?'<button class="pilula" id="opdf">Baixar PDF da ordem de compra</button>':'<p class="integra" style="margin:0">Pendente de liberação. Confira os itens abaixo; o download só aparece depois da liberação.</p><button class="pilula verde" id="olib">Liberar ordem de compra (senha de liberação)</button>'}<a class="pilula clara" href="#cmp-c-${o.cot}">Ver pedido de cotação COT ${esc(o.cotNum)}</a></section>
  <section class="bloco" style="margin-top:12px;gap:0">${o.itens.map(x=>`<div class="cm-l"><b>${esc(x.d)}</b><small>${nBR(x.q)} ${esc(x.u)} × ${rBR(x.pu)} = <b>${rBR(x.tot)}</b></small><small>${esc(x.r.map(r=>r.c+(x.r.length>1?" ("+nBR(r.q)+")":"")).join(" · "))}</small></div>`).join("")}
   <div class="cm-l"><div class="cm-r"><b style="flex:1">Total do pedido</b><b>${rBR(o.total)}</b></div></div></section>`;
  if(!lib){document.getElementById("olib").onclick=()=>libLogin(o);return}
  document.getElementById("opdf").onclick=async e=>{e.target.disabled=true;e.target.textContent="Gerando PDF…";try{entregaArq(await pdfOC(o))}catch(x){console.error(x);toast("Não deu para gerar o PDF.")}e.target.disabled=false;e.target.textContent="PDF da ordem de compra"};
}
async function libOk(pw){const L=CMP.lib;const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw.trim().toLowerCase()),"PBKDF2",false,["deriveBits"]);
  const h=new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt:b64u(L.s),iterations:L.it,hash:"SHA-256"},base,256)),e=b64u(L.h);return h.length===e.length&&h.every((x,i)=>x===e[i])}
function libLogin(o){const m=document.createElement("div");m.id="mt";m.className="modal";
  m.innerHTML=`<form class="login" style="margin:0;width:100%"><h1 style="font-size:1.4rem">Liberar OC ${esc(o.num)}</h1><p>${esc(o.forn.nome)} · ${rBR(o.total)}</p>
   <div class="campo"><i style="background:var(--folha)"></i><input id="ln" placeholder="Nome de quem libera" maxlength="60"></div>
   <div class="campo"><i style="background:var(--terra)"></i><input id="ls" type="password" placeholder="Senha de liberação" autocomplete="off"></div>
   <button class="pilula verde" type="submit" id="lb">Liberar</button><button class="pilula clara" type="button" id="lx">Fechar</button>
   <p id="le" hidden style="color:#DC2626;font-weight:800;margin:0;text-align:center"></p></form>`;
  document.body.appendChild(m);const $=id=>m.querySelector("#"+id);$("lx").onclick=()=>m.remove();setTimeout(()=>$("ln").focus(),50);
  m.querySelector("form").addEventListener("submit",async e=>{e.preventDefault();const nome=$("ln").value.trim(),er=t=>{$("le").textContent=t;$("le").hidden=false};
    if(nome.length<2)return er("Digite o nome de quem libera.");if(!$("ls").value)return er("Digite a senha de liberação.");$("lb").disabled=true;$("lb").textContent="Conferindo…";
    if(!(await libOk($("ls").value))){$("lb").disabled=false;$("lb").textContent="Liberar";return er("Senha de liberação errada.")}
    await DB.collection("ocs").doc(o.id).update({status:"liberada",libNome:nome,libEm:new Date().toISOString()});
    try{await DB.collection("historico").add({acao:"liberou ordem de compra",cod:"OC "+o.num,titulo:o.forn.nome,obra:"",nome,papel:"Liberação",em:new Date().toISOString(),doc:""})}catch(_){}
    m.remove();await cmpStatus();toast("Ordem de compra liberada.");cmpOC(o.id)});
}
function cmpForn(){
  app.innerHTML=cmpTopo("Fornecedores")+`<section class="bloco">${CMP.fornecedores.map(f=>`<div class="cm-card"><span><b>${esc(f.nome)}</b><small>${esc([f.cnpj&&"CNPJ "+f.cnpj,f.cidade,f.ac&&"A/C "+f.ac,f.email].filter(Boolean).join(" · "))}</small></span></div>`).join("")}</section>
  <p class="integra">Fornecedor novo entra na hora de anexar um orçamento.</p>`}

/* --- situação do item --- */
async function cmpStatus(){if(!DB)return;const st={},lev={cot:1,orc:2,oc:3,rec:4},up=(c,s,t)=>{if(c&&(!st[c]||lev[s]>=lev[st[c].s]))st[c]={s,t}};
  const [cs,os,ocs,bx]=await Promise.all([colDocs("cotacoes"),colDocs("orcamentos"),colDocs("ocs"),colDocs("baixas")]);const cm={};cs.forEach(c=>cm[c.id]=c);
  cs.forEach(c=>c.linhas.forEach(l=>l.r.forEach(r=>up(r.c,"cot","COT "+c.num))));
  os.forEach(o=>{const c=cm[o.cot];if(!c)return;(o.precos||[]).forEach((p,i)=>{if(p&&p.pu>0&&c.linhas[i])c.linhas[i].r.forEach(r=>up(r.c,"orc","COT "+c.num))})});
  ocs.filter(o=>o.status==="liberada").forEach(o=>o.itens.forEach(x=>x.r.forEach(r=>up(r.c,"oc","OC "+o.num))));
  const kc=k2c();bx.forEach(b=>(b.itens||[]).forEach(k=>up(kc[k],"rec","NF "+(b.nf||""))));ST=st;
  const m=location.hash.match(/^#obra-(\d\d)-mat/);if(m&&!document.getElementById("mt"))rota()}
const _iH=itemHTML;itemHTML=function(it){let h=_iH(it);const s=it[4]&&ST[it[4]];
  if(s&&s.s!=="rec") h=h.replace('</small></span><span class="q">',`</small><span class="stc ${s.s}">${{cot:"em cotação",orc:"orçado",oc:"comprado"}[s.s]} · ${esc(s.t)}</span></span><span class="q">`);return h};
setTimeout(()=>{const t=setInterval(()=>{if(DB){clearInterval(t);cmpStatus()}},400)},500);

/* --- PDF no modelo da OC --- */
let FNT=null,LOGOC=null;
async function pdfBase(){if(!window.jspdf){await new Promise((ok,er)=>{const s=document.createElement("script");s.src="jspdf.min.js";s.onload=ok;s.onerror=er;document.head.appendChild(s)})}
  if(!FNT){FNT={};for(const f of ["Nunito-Regular.ttf","Nunito-Bold.ttf","Nunito-Black.ttf"]){const u=new Uint8Array(await (await fetch("fonts/"+f)).arrayBuffer());let s="";for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));FNT[f]=s}}
  if(!LOGOC){const b=await (await fetch("logo-oc.jpg")).blob();LOGOC=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(b)})}
  const doc=new jspdf.jsPDF({unit:"mm",format:"a4"});
  doc.addFileToVFS("NR.ttf",FNT["Nunito-Regular.ttf"]);doc.addFont("NR.ttf","Nunito","normal");doc.addFileToVFS("NB.ttf",FNT["Nunito-Bold.ttf"]);doc.addFont("NB.ttf","Nunito","bold");
  doc.addFileToVFS("NK.ttf",FNT["Nunito-Black.ttf"]);doc.addFont("NK.ttf","NunitoK","normal");return doc}
const CR={creme:[242,226,201],verde:[46,94,69],terra:[196,105,63],txt:[40,40,40],cinza:[110,104,96],linha:[226,220,210],rosa:[251,243,236],zebra:[250,247,242]};
function pdfDocumento(doc,o){/* o: {tipo, titulo, sub, numLab, num, data, forn, cols, rows, totalRow, nota, cond, instr} */
  const W=210,M=14,cor=(k,f="t")=>{const c=CR[k];f==="t"?doc.setTextColor(...c):f==="f"?doc.setFillColor(...c):doc.setDrawColor(...c)};
  const F=(st,sz)=>{if(st==="k")doc.setFont("NunitoK","normal");else doc.setFont("Nunito",st);doc.setFontSize(sz)};
  const topo=(first)=>{cor("creme","f");doc.rect(0,0,W,first?40:22,"F");
    if(first){doc.addImage(LOGOC,"JPEG",M,4,24.6,32);cor("terra","d");doc.setLineWidth(.3);doc.line(44,7,44,33);
      F("bold",6.5);cor("terra");doc.text(CMP.faixa||"SUPRIMENTOS · OBRA COMPLEXO DE LAZER VILLA RICA",48,10.5,{charSpace:.9});
      F("k",21);cor("verde");doc.text(o.titulo,48,21);F("normal",8.5);cor("cinza");doc.text(doc.splitTextToSize(o.sub,105).slice(0,2),48,27.5);
      F("bold",6.5);cor("cinza");doc.text(o.numLab,W-M,12,{align:"right",charSpace:.9});F("k",15);cor("terra");doc.text(o.num,W-M,20.5,{align:"right"});F("normal",8);cor("cinza");doc.text(o.data,W-M,26,{align:"right"});
      cor("terra","f");doc.rect(0,40,W,1.1,"F");return 50}
    F("k",11);cor("verde");doc.text(o.titulo+" · "+o.num,M,13);F("normal",7.5);cor("cinza");doc.text("continuação",W-M,13,{align:"right"});cor("terra","f");doc.rect(0,22,W,.8,"F");return 30};
  const rod=()=>{cor("verde","f");doc.rect(0,287,W,10,"F");F("bold",6.5);doc.setTextColor(255,255,255);doc.text(CMP.rodape||"Complexo de Lazer Villa Rica · MG-129",M,293,{charSpace:.8});doc.text(o.tipo,W-M,293,{align:"right",charSpace:1.1})};
  let y=topo(true);
  // comprador / fornecedor
  const bloco=(x,lab,nome,linhas,w)=>{F("bold",6.3);cor("cinza");doc.text(lab,x,y,{charSpace:1});F("k",8.6);cor("txt");doc.text(nome||"",x,y+5);F("normal",7.8);let yy=y+9.2;linhas.filter(Boolean).forEach(l=>{doc.splitTextToSize(l,w).forEach(t=>{doc.text(t,x,yy);yy+=3.7})});return yy};
  const f=o.forn||{},fl=o.forn?[f.cnpj&&"CNPJ "+f.cnpj,f.end,f.cidade,(f.ac||f.email)&&["A/C "+(f.ac||""),f.email].filter(Boolean).join(" · ")]:["Razão social: _______________________________","CNPJ: ____________________  Contato: __________","E-mail / telefone: ___________________________"];
  const cl=[...CMP.comprador.linhas];if(o.forn&&f.cliente)cl.splice(1,0,`Cliente ${f.nome.split(" ")[0][0]+f.nome.split(" ")[0].slice(1).toLowerCase()} nº ${f.cliente}`);
  const y1=bloco(M,"COMPRADOR",CMP.comprador.nome,cl,88),y2=bloco(110,"FORNECEDOR",o.forn?f.nome:"",fl,86);y=Math.max(y1,y2)+4;
  // entrega / faturamento
  const en=CMP.entrega,fa=CMP.faturamento,obsL=doc.splitTextToSize(en.obs||"",80);F("normal",7.4);const hb=Math.max(15+en.linhas.length*3.8+obsL.length*3.3,12+fa.linhas.length*4)+4;
  cor("rosa","f");cor("linha","d");doc.setLineWidth(.25);doc.roundedRect(M,y,88,hb,2,2,"FD");cor("terra","f");doc.rect(M,y,88,.9,"F");
  doc.setFillColor(255,255,255);doc.roundedRect(108,y,88,hb,2,2,"FD");doc.setFillColor(90,140,170);doc.rect(108,y,88,.9,"F");
  F("k",9);cor("terra");doc.text(en.titulo,M+4,y+6.5);F("bold",7.8);cor("txt");let yy=y+11;en.linhas.forEach(l=>{doc.text(l,M+4,yy);yy+=3.8});F("normal",7);cor("cinza");obsL.forEach(l=>{doc.text(l,M+4,yy+1);yy+=3.3});
  F("k",9);cor("verde");doc.text(fa.titulo,112,y+6.5);F("normal",7.8);cor("txt");yy=y+11;fa.linhas.forEach((l,i)=>{F(i?"normal":"bold",7.8);doc.text(l,112,yy);yy+=4});
  y+=hb+8;
  const secao=(n,t,extra,x=M)=>{cor("terra","f");doc.circle(x+2.6,y-1.3,2.6,"F");F("bold",7.5);doc.setTextColor(255,255,255);doc.text(String(n),x+2.6,y-.1,{align:"center"});F("k",11);cor("verde");doc.text(t,x+7.5,y);if(extra){const wt=doc.getTextWidth(t);F("normal",7);cor("cinza");doc.text(extra,x+10+wt,y)}};
  secao(1,o.secItens,o.destino?"· Destino: "+o.destino:"");y+=5;
  // tabela
  const cols=o.cols,tx=[M];cols.forEach(c=>tx.push(tx[tx.length-1]+c.w));
  const cab=()=>{cor("verde","f");doc.rect(M,y,182,7.5,"F");if(o.totCol){cor("terra","f");doc.rect(tx[cols.length-1],y,cols[cols.length-1].w,7.5,"F")}
    F("bold",6);doc.setTextColor(255,255,255);cols.forEach((c,i)=>{const xx=c.a==="r"?tx[i+1]-2:tx[i]+2;doc.text(c.t,xx,y+4.8,c.a==="r"?{align:"right"}:{charSpace:.5})});y+=7.5};
  cab();
  o.rows.forEach((r,ri)=>{F("bold",7.6);const dl=doc.splitTextToSize(r.d,cols[1].w-4);F("normal",6.2);const ol=r.obs?doc.splitTextToSize(r.obs,cols[1].w-4):[];
    const h=Math.max(7.5,2.4+dl.length*3.4+ol.length*2.8+1.2);
    if(y+h>270){rod();doc.addPage();y=topo(false);cab()}
    if(ri%2){cor("zebra","f");doc.rect(M,y,182,h,"F")}cor("linha","d");doc.setLineWidth(.2);doc.line(M,y+h,M+182,y+h);
    F("normal",7);cor("cinza");doc.text(r.c||"",tx[0]+2,y+4.6);
    let yy=y+4.6;F("bold",7.6);cor("txt");dl.forEach(t=>{doc.text(t,tx[1]+2,yy);yy+=3.4});F("normal",6.2);cor("terra");ol.forEach(t=>{doc.text(t,tx[1]+2,yy-.4);yy+=2.8});
    F("bold",7.4);cor("txt");r.v.forEach((v,k)=>{const i=k+2,c=cols[i];if(v===null){cor("linha","d");doc.setLineWidth(.25);doc.rect(tx[i]+1.2,y+1.5,c.w-2.4,4.6);return}
      if(o.totCol&&i===cols.length-1){F("k",7.8);cor("terra")}else{F(i===2?"bold":"normal",7.4);cor("txt")}doc.text(String(v),c.a==="r"?tx[i+1]-2:tx[i]+2,y+4.6,{align:c.a==="r"?"right":"left"})});
    y+=h});
  if(o.totalRow){if(y+9>270){rod();doc.addPage();y=topo(false)}cor("creme","f");doc.rect(M,y,182,8,"F");F("k",8);cor("txt");doc.text(o.totalRow.t,tx[1]+2,y+5.2);if(o.totalRow.q)doc.text(o.totalRow.q,tx[3]-2,y+5.2,{align:"right"});
    cor("terra","f");doc.rect(tx[cols.length-1]-8,y,cols[cols.length-1].w+8,8,"F");doc.setTextColor(255,255,255);doc.text(o.totalRow.v,tx[cols.length]-2,y+5.2,{align:"right"});y+=8}
  if(o.nota){F("normal",6.6);cor("cinza");const nl=doc.splitTextToSize(o.nota,182);y+=4;nl.forEach(t=>{doc.text(t,M,y);y+=3.2})}
  // condições + instruções
  F("normal",7.6);const cw=(t,w)=>doc.splitTextToSize(t,w),ins=o.instr.map(t=>cw(t,80));const condH=o.cond.reduce((a,[k,v])=>a+Math.max(1,cw(v,58).length)*3.7+2,0),insH=ins.reduce((a,l)=>a+l.length*3.7+1.8,0);
  if(y+16+Math.max(condH,insH)+26>282){rod();doc.addPage();y=topo(false)}
  y+=9;secao(2,o.secCond);secao(3,"Instruções ao fornecedor","",108);y+=6;let yc=y,yi=y;
  o.cond.forEach(([k,v])=>{F("bold",7.6);cor("txt");doc.text(k,M,yc);F("normal",7.6);const l=cw(v,58);doc.text(l,M+30,yc);yc+=Math.max(1,l.length)*3.7+2});
  ins.forEach(l=>{cor("verde","f");doc.circle(109.5,yi-1.1,.7,"F");F("normal",7.6);cor("txt");doc.text(l,112,yi);yi+=l.length*3.7+1.8});
  y=Math.max(yc,yi)+12;cor("txt","d");doc.setLineWidth(.3);doc.line(70,y,140,y);F("k",8.2);cor("txt");doc.text(CMP.assinatura[0],105,y+4.5,{align:"center"});F("normal",7.6);doc.text(CMP.assinatura[1]||"",105,y+8.5,{align:"center"});
  rod();const np=doc.getNumberOfPages();if(np>1)for(let i=1;i<=np;i++){doc.setPage(i);F("normal",6.5);doc.setTextColor(255,255,255);doc.text(`pág. ${i}/${np}`,105,293,{align:"center"})}
  return doc}
async function pdfCot(c,forn){const doc=await pdfBase();
  const rows=c.linhas.map((l,i)=>{const q=l.r.reduce((a,r)=>a+r.q,0);return{c:String(i+1),d:l.d,obs:"OBS: "+l.r.map(r=>r.c+(l.r.length>1?" ("+nBR(r.q)+" "+l.u+")":"")+" · "+obra(r.o)[1]).join(" | "),v:[nBR(q),l.u,null,null,null,null]}});
  pdfDocumento(doc,{tipo:"PEDIDO DE COTAÇÃO",titulo:"Pedido de Cotação",sub:c.titulo+(c.destino?" · "+c.destino:""),numLab:"Nº DO PEDIDO",num:"COT "+c.num,data:dLong(c.em),forn,destino:c.destino,secItens:"Itens para cotação",
    cols:[{t:"ITEM",w:10},{t:"DESCRIÇÃO / OBS",w:80},{t:"QTDE",w:18,a:"r"},{t:"UNID.",w:12},{t:"PREÇO UNIT.",w:22},{t:"ICMS",w:12},{t:"IPI",w:10},{t:"TOTAL",w:18}],rows,
    nota:"Preencha preço unitário, ICMS e IPI de cada linha. Mantenha o código VR (OBS) na proposta: ele identifica a obra e a destinação de cada item.",
    secCond:"Condições da proposta",cond:[["Prazo de resposta",c.prazo||"o quanto antes"],["Entrega","Na obra (frete CIF), conforme endereço acima"],["Pagamento","Informar condições e parcelas"],["Validade","Informar validade da proposta"]],instr:CMP.instrCOT});
  return new File([doc.output("blob")],`Pedido de cotacao COT ${c.num} - Villa Rica${forn?" - "+forn.nome.split(" ")[0]:""}.pdf`,{type:"application/pdf"})}
async function pdfOC(o){if(o.status!=="liberada")throw new Error("pendente");const doc=await pdfBase();
  const us=[...new Set(o.itens.map(x=>x.u))],u1=us.length===1?us[0]:"";
  const rows=o.itens.map(x=>({c:x.cf||"",d:x.d,obs:"Obra/destino: "+x.r.map(r=>r.c+(x.r.length>1?" ("+nBR(r.q)+" "+x.u+")":"")+" · "+obra(r.o)[1]+" · "+(D.sigNome[sigDe(r.c)]||"")).join(" | "),
    v:[qBR(x.q)+(u1?"":" "+x.u),rBR(x.pu),nBR(x.icms,2)+"%",nBR(x.ipi,2)+"%",Number(x.tot).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})]}));
  const pg=o.pag||{},venc=String(pg.venc||"").split(/[,;\s]+/).filter(Boolean),parc=pg.parc||1,vp=o.total/parc;
  const pagTxt=`${pg.forma||"A combinar"}${parc>1?` – ${parc} parcelas de ${rBR(vp)}`:` – ${rBR(o.total)}`}${venc.length?`, com vencimento em ${venc.join(", ")} dias`:""}`;
  const cond=[["Pagamento",pagTxt]];if(o.frete)cond.push(["Frete",o.frete]);
  pdfDocumento(doc,{tipo:"ORDEM DE COMPRA",titulo:"Ordem de Compra",sub:o.titulo+(o.destino?" · "+o.destino:""),numLab:"Nº DA OC",num:o.num,data:dLong(o.em),forn:o.forn,destino:o.destino,secItens:"Itens do pedido",totCol:true,
    cols:[{t:"CÓDIGO",w:18},{t:"DESCRIÇÃO",w:70},{t:u1?`QTDE (${u1.toUpperCase()})`:"QTDE",w:22,a:"r"},{t:u1?`PREÇO/${u1.toUpperCase()}`:"PREÇO UNIT.",w:20,a:"r"},{t:"ICMS",w:11,a:"r"},{t:"IPI",w:9,a:"r"},{t:"TOTAL (R$)",w:32,a:"r"}],rows,
    totalRow:{t:"TOTAL DO PEDIDO",q:u1?qBR(o.itens.reduce((a,x)=>a+x.q,0)):"",v:rBR(o.total)},
    nota:[o.obsImp,`Valores conforme ${o.prop?"proposta nº "+o.prop:"orçamento do fornecedor"}${o.propData?" de "+o.propData:""} (pedido de cotação COT ${o.cotNum}).`].filter(Boolean).join(" "),
    secCond:"Condições comerciais",cond,instr:CMP.instrOC});
  return new File([doc.output("blob")],`OC_${o.num}_Villa_Rica_${o.forn.nome.split(" ")[0]}.pdf`,{type:"application/pdf"})}

addEventListener("vr-sync",()=>{cmpStatus();if(/^#cmp/.test(location.hash)&&CMP&&!document.getElementById("mt")&&!/^#cmp-(rev|nova|o-)/.test(location.hash))rota()});
