/* Gestão: painel, caixa de pedidos, projetos e ajustes. Só o gestor entra (login por link no e-mail). */
(() => {
  /* ---------- vocabulário da gestão ---------- */
  const ESF = ["","muito baixo (horas)","baixo (poucos dias)","médio (algumas semanas)","alto (cerca de um mês)","muito alto (vários meses)"];
  const IMP = ["","uma pessoa","parte de um setor","um setor inteiro","vários setores","a construtora toda"];
  const PSTATUS = ["planejamento","em andamento","pausado","testes","concluído"];
  const SYNC = {"planejamento":"aprovado","em andamento":"em desenvolvimento","testes":"em desenvolvimento","concluído":"entregue"};
  const PCOR = {"planejamento":"var(--st-plan)","em andamento":"var(--st-and)","pausado":"var(--flag)","testes":"var(--st-test)","concluído":"var(--ok)"};
  const TST = ["pendente","em andamento","pronto"];
  const ETAPAS = [
    {k:"direcionamento", t:"1. direcionamento", topicos:[
      {k:"problema", t:"problema e objetivo", itens:["objetivo","problema e situação atual (como é feito hoje e qual a dor medida)","indicadores de sucesso (2 ou 3 números com meta)"]},
      {k:"pessoas", t:"pessoas", itens:["público","responsáveis (quem usa e quem decide)"]},
      {k:"escopo", t:"escopo", itens:["escopo inicial","fora do escopo","processo piloto"]},
      {k:"viab", t:"viabilidade e investimento", itens:["alternativas consideradas (comprar, usar o que existe ou não fazer)","investimento: desenvolvimento, custo mensal e retorno esperado"]}]},
    {k:"funcionamento", t:"2. funcionamento", topicos:[
      {k:"processo", t:"processo e regras", itens:["fluxo do processo (quem faz o quê, exceções e erros)","regras","critérios de aceite"]},
      {k:"telas", t:"telas e uso", itens:["telas","notificações","relatórios e indicadores","uso em campo (celular, internet ruim)"]},
      {k:"acessos", t:"acessos e rastreabilidade", itens:["acessos","perfis e permissões","histórico e auditoria"]},
      {k:"dados", t:"dados e integrações", itens:["dados","dados pessoais (lgpd)","migração de dados","integrações"]}]},
    {k:"arquitetura", t:"3. arquitetura", topicos:[
      {k:"solucao", t:"solução técnica", itens:["tecnologias","serviços de nuvem","diagrama da solução","ambientes"]},
      {k:"seguranca", t:"segurança e acesso", itens:["segurança","autenticação","gestão de segredos e senhas"]},
      {k:"operacao", t:"operação", itens:["capacidade","custos de nuvem","monitoramento e alertas","registros (logs) e rastreabilidade"]},
      {k:"continuidade", t:"continuidade e propriedade", itens:["backup e recuperação","metas de recuperação","responsável técnico e continuidade","propriedade do código e dos dados","plano de desativação"]}]},
    {k:"execucao", t:"4. execução", topicos:[
      {k:"planejamento", t:"planejamento", itens:["entregas priorizadas","equipe","cronograma","gerenciamento de riscos","gestão de mudanças"]},
      {k:"qualidade", t:"qualidade", itens:["testes","definição de pronto","piloto antes do lançamento geral"]},
      {k:"lancamento", t:"lançamento", itens:["plano de lançamento e de volta atrás","plano de comunicação","treinamento"]},
      {k:"pos", t:"pós-lançamento", itens:["suporte","canal de feedback e melhorias","revisão pós-lançamento"]}]}
  ];
  const TOPICOS = ETAPAS.flatMap(e=>e.topicos);
  const NT = TOPICOS.length;
  const TOP = Object.fromEntries(TOPICOS.map(t=>[t.k,t]));
  const etapaDe = k => ETAPAS.find(e=>e.topicos.some(t=>t.k===k));
  const PARES = [["problema","qualidade"],["viab","operacao"],["escopo","planejamento"],["processo","qualidade"],["acessos","seguranca"],["dados","continuidade"],["pessoas","planejamento"],["telas","processo"],["solucao","dados"],["lancamento","pessoas"]];
  const RELS = {}; PARES.forEach(([a,b])=>{ (RELS[a] ||= []).push(b); (RELS[b] ||= []).push(a); });
  const etapasVazias = () => Object.fromEntries(TOPICOS.map(t=>[t.k,{txt:"",st:"pendente"}]));
  const NEXT = {
    "recebido":[["em análise","iniciar análise","primary"],["recusado","recusar","danger"]],
    "em análise":[["aprovado","aprovar","primary"],["recusado","recusar","danger"]],
    "aprovado":[["em desenvolvimento","iniciar desenvolvimento","primary"]],
    "em desenvolvimento":[["entregue","marcar como entregue","primary"]],
    "entregue":[["em desenvolvimento","reabrir",""]],
    "recusado":[["em análise","reabrir análise",""]]
  };
  const VIEWS = ["painel","pedidos","projetos","projeto","enviar","ajustes"];

  /* ---------- ícones ---------- */
  const I = {
    home:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>`,
    inbox:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/></svg>`,
    board:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/></svg>`,
    send:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
    gear:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`,
    clock:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
    alert:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></svg>`,
    flag:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4h11l-2 4 2 4H5"/></svg>`,
    pause:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6v12M15 6v12"/></svg>`,
    link:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>`,
    user:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>`,
    chev:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`,
    spark:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></svg>`
  };
  const EXTL = {pdf:"PDF",png:"IMG",jpg:"IMG",jpeg:"IMG",gif:"IMG",webp:"IMG",svg:"IMG",mp4:"VID",webm:"VID",csv:"CSV",md:"MD",json:"JSON",txt:"TXT",doc:"DOC",docx:"DOC",xls:"XLS",xlsx:"XLS",ppt:"PPT",pptx:"PPT",dwg:"DWG",zip:"ZIP"};
  const svgDoc = nome => { const x=(String(nome).split(".").pop()||"").toLowerCase(), t=EXTL[x]||"ARQ"; return `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M5 2.5h9l5 5V21.5H5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 2.5v5h5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><text x="12" y="17.5" font-size="${t.length>3?4.6:5.6}" font-weight="700" text-anchor="middle" fill="currentColor" font-family="Arial,sans-serif">${t}</text></svg>`; };

  /* ---------- estado ---------- */
  const st = {
    pedidos:[], projetos:[], configRows:[], pesos:{diretoria:50,esforco:30,impacto:20}, visto:0, carregado:false, user:null,
    view: mem.get("cp-view","painel"), selPed:null, selProj: mem.get("cp-proj","")||null, projTab:"geral", selTopic:null,
    grupo:"triar", fTipo:"", fSetor:"", busca:"", projModo: mem.get("cp-pmodo","quadro"), projBusca:"",
    tipo:"novo projeto", formPlat:"", recusando:null, pesosOpen:false, docKind:"link",
    ai:{}, aiProj:{}, aiTop:{}, sum:null
  };
  if (!VIEWS.includes(st.view)) st.view="painel";

  /* ---------- acesso ao banco ---------- */
  async function run(builder){
    const { data, error } = await builder;
    if (error){ console.warn(error); toast(erroTxt(error)); throw error; }
    return data;
  }
  const ok = async builder => { try{ await run(builder); return true; }catch{ return false; } };

  async function carregar(){
    if (!sb || !st.user) return;
    const [pe, pr, cf] = await Promise.all([
      sb.from("pedidos").select("*").order("criado_em",{ascending:false}),
      sb.from("projetos").select("*"),
      sb.from("config").select("*")
    ]);
    const err = pe.error || pr.error || cf.error;
    if (err){ console.warn(err); toast(erroTxt(err)); return; }
    st.pedidos = pe.data; st.projetos = pr.data; st.configRows = cf.data;
    const c = Object.fromEntries(cf.data.map(r=>[r.chave, r.valor]));
    if (c.pesos) st.pesos = {diretoria:+c.pesos.diretoria||0, esforco:+c.pesos.esforco||0, impacto:+c.pesos.impacto||0};
    st.visto = +c.visto?.em || 0;
    st.carregado = true;
    schedule();
  }
  const salvarConfig = (chave, valor) => ok(sb.from("config").upsert({chave, valor}));

  /* pedidos: linhas cruas do banco em st.pedidos; mk() traduz para a tela */
  const tms = s => s ? Date.parse(s) : 0;
  const mk = r => ({
    id:r.id, codigo:r.codigo, tipo:r.tipo, setor:r.setor, nome:r.nome, plataforma:r.plataforma||"", projetoId:r.projeto_id||null,
    titulo:r.titulo, descricao:r.descricao||"", precisaAte:r.precisa_ate||"", criadoEm:tms(r.criado_em),
    status:r.status||"recebido", statusEm:tms(r.status_em), msg:r.msg||"", hist:Array.isArray(r.hist)?r.hist:[],
    novo: tms(r.criado_em) > st.visto,
    g:{diretoria:!!r.diretoria, esforco:r.esforco||null, impacto:r.impacto||null, prazo:r.prazo||"", notas:r.notas||""}
  });
  const allPedidos = () => st.pedidos.map(mk);
  const rowPed = id => st.pedidos.find(r=>r.id===id);
  async function patchPed(id, patch){
    const r=rowPed(id); if (!r) return false;
    Object.assign(r, patch);
    const done = await ok(sb.from("pedidos").update(patch).eq("id", id));
    if (!done) carregar();
    return done;
  }
  function setStatus(id, status, extra={}){
    const r=rowPed(id); if (!r) return Promise.resolve(false);
    const hist=[...(Array.isArray(r.hist)?r.hist:[]), {s:status, em:Date.now()}].slice(-20);
    return patchPed(id, {status, status_em:new Date().toISOString(), hist, ...extra});
  }

  /* projetos: linhas cruas do banco */
  const curP = id => st.projetos.find(x=>x.id===id);
  async function updP(p, data){
    const d = {...data, atualizado_em:new Date().toISOString()};
    if ("prazo" in d && !d.prazo) d.prazo = null;
    Object.assign(p, d);
    const done = await ok(sb.from("projetos").update(d).eq("id", p.id));
    if (!done) carregar();
    return done;
  }
  function updTopic(pid,k,patch){
    const cur=curP(pid); if (!cur) return Promise.resolve(false);
    const etapas={...etapasVazias(), ...(cur.etapas||{})}; etapas[k]={...(etapas[k]||{}), ...patch};
    return updP(cur,{etapas});
  }

  /* ---------- renderização sem atrapalhar digitação ---------- */
  let pressing=false, dirty=false;
  const typing = () => { const a=document.activeElement; return !!(a && a.hasAttribute && a.hasAttribute("data-keep")); };
  function schedule(){ if (pressing || typing()) { dirty=true; return; } render(); }
  document.addEventListener("pointerdown", ()=>{ pressing=true; }, true);
  const rel = () => setTimeout(()=>{ pressing=false; if (dirty) schedule(); }, 80);
  document.addEventListener("pointerup", rel, true); document.addEventListener("pointercancel", rel, true);
  document.addEventListener("focusout", ()=>setTimeout(()=>{ if (dirty) schedule(); }, 120));

  function render(){
    if (!st.user) return;
    dirty=false;
    const a=document.activeElement, fid=a?.id, ss=a?.selectionStart, se=a?.selectionEnd;
    const sc=$("#det")?.scrollTop;
    const drafts=Object.fromEntries($$("[data-draft]").filter(el=>el.id).map(el=>[el.id, el.value]));
    renderRail();
    const fn = {painel:vPainel, pedidos:vPedidos, projetos:vProjetos, projeto:vProjeto, enviar:vEnviar, ajustes:vAjustes}[st.view] || vPainel;
    $("#view").innerHTML = fn();
    if (sc && $("#det")) $("#det").scrollTop=sc;
    Object.entries(drafts).forEach(([k,v])=>{ const el=document.getElementById(k); if (el && el.hasAttribute("data-draft")) el.value=v; });
    if (fid){ const el=document.getElementById(fid); if (el && el!==document.activeElement){ el.focus({preventScroll:true}); try{ if (ss!=null) el.setSelectionRange(ss,se); }catch{} } }
  }
  function go(view, extra={}){
    Object.assign(st, extra); st.view=view; mem.set("cp-view", view);
    if (st.selProj) mem.set("cp-proj", st.selProj);
    render(); window.scrollTo({top:0});
  }

  /* ---------- dados derivados ---------- */
  function score(p){
    const w=st.pesos, g=p.g||{}; const d=g.diretoria?1:0, e=g.esforco||3, i=g.impacto||3;
    const tot=(w.diretoria+w.esforco+w.impacto)||1;
    const v=(w.diretoria*d + w.esforco*((5-e)/4) + w.impacto*((i-1)/4))/tot;
    return {n:Math.round(v*100), est:!(g.esforco&&g.impacto)};
  }
  const dias = ts => Math.floor((Date.now()-ts)/DAY);
  const idade = ts => { const d=dias(ts); return d<=0?"hoje":d===1?"há 1 dia":`há ${d} dias`; };
  const diasAte = s => { if (!s) return null; const d=new Date(s+"T12:00:00"); if (isNaN(d)) return null; const h=new Date(); h.setHours(12,0,0,0); return Math.round((d-h)/DAY); };
  const vinculo = p => p.projetoId && st.projetos.some(x=>x.id===p.projetoId) ? p.projetoId : null;
  function sugestaoProjeto(p){
    if (vinculo(p) || !p.plataforma) return null; const alvo=norm(p.plataforma); if (!alvo) return null;
    return st.projetos.find(pr=>{ const t=norm(pr.titulo); return t && (t.includes(alvo)||alvo.includes(t)); }) || null;
  }
  const pedidosDoProjeto = pid => allPedidos().filter(x=>vinculo(x)===pid).sort((a,b)=>b.criadoEm-a.criadoEm);
  const pst = p => low(p.status)||"planejamento";
  const stT = (p,k) => p.etapas?.[k]?.st || "pendente";
  const etapaN = (p,e) => e.topicos.filter(t=>stT(p,t.k)==="pronto").length;
  const prontos = p => TOPICOS.filter(t=>stT(p,t.k)==="pronto").length;
  const faltam = (p,e) => e.topicos.filter(t=>stT(p,t.k)!=="pronto");
  const etapaAtual = p => ETAPAS.find(e=>faltam(p,e).length) || null;
  const ck = p => { const c=p.checklist||[]; return {done:c.filter(i=>i.feito).length, total:c.length}; };
  const andamento = p => { const c=ck(p); return pct(prontos(p)+c.done, NT+c.total); };
  const prazoP = p => { const d=diasAte(p.prazo); if (d===null || pst(p)==="concluído") return {d, late:false, soon:false, t:""}; return {d, late:d<0, soon:d>=0&&d<=7, t: d<0?`venceu há ${plural(-d,"dia")}`:d===0?"vence hoje":`faltam ${plural(d,"dia")}`}; };
  const trecho = (p,k,n) => { const t=(p.etapas?.[k]?.txt||"").trim().replace(/\s+/g," "); return t ? (t.length>n?t.slice(0,n)+"…":t) : "ainda sem texto"; };
  const spCls = s => s==="pronto"?"p":s==="em andamento"?"a":"";
  const bar = (a,b,thin) => `<div class="bar ${thin?"thin":""}" role="progressbar" aria-valuemin="0" aria-valuemax="${b}" aria-valuenow="${a}"><i style="width:${pct(a,b)}%"></i></div>`;
  const host = u => { try{ return new URL(u).hostname.replace(/^www\./,""); }catch{ return u; } };
  const fmtSize = n => !n ? "" : n<1024 ? n+" b" : n<1048576 ? Math.round(n/1024)+" kb" : (n/1048576).toFixed(1).replace(".",",")+" mb";
  const urlOk = v => { v=String(v||"").trim(); if (!v) return null; try{ const u=new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(v)?v:"https://"+v); return /^https?:$/.test(u.protocol)?u.href:null; }catch{ return null; } };
  const sortedP = () => [...st.projetos].sort((a,b)=>tms(b.atualizado_em||b.criado_em)-tms(a.atualizado_em||a.criado_em));
  const iaLbl = t => IA.integrada() ? t : `${t} (copiar para o Claude)`;

  /* ---------- trilho ---------- */
  function renderRail(){
    const triar=allPedidos().filter(p=>p.status==="recebido").length;
    const item = (v,ic,t,extra="") => `<button data-act="nav" data-v="${v}" aria-current="${st.view===v || (v==="projetos"&&st.view==="projeto")}">${I[ic]}<span>${t}</span>${extra}</button>`;
    const list = sortedP();
    $("#rail").innerHTML = `
      <div class="brand"><img src="assets/logo.png" alt="Diálogo Engenharia"><span>controle de projetos</span></div>
      <nav class="nav">
        ${item("painel","home","painel")}
        ${item("pedidos","inbox","pedidos", triar?`<span class="bd" title="para triar">${triar}</span>`:"")}
        ${item("projetos","board","projetos", `<span class="ct">${st.projetos.length||""}</span>`)}
        ${item("enviar","send","registrar pedido")}
        ${item("ajustes","gear","ajustes")}
      </nav>
      <div class="rp">
        <div class="rp-h"><span>projetos</span><button data-act="new-proj" aria-label="novo projeto" title="novo projeto">+</button></div>
        <ul>${list.length ? list.map(p=>`<li><button data-act="open-proj" data-id="${esc(p.id)}" aria-current="${st.view==="projeto"&&p.id===st.selProj}"><i class="dot" style="--c:${PCOR[pst(p)]}"></i><span class="t">${esc(p.titulo||"projeto sem título")}</span><span class="pp num">${andamento(p)}%</span></button></li>`).join("") : `<li class="none">nenhum projeto ainda.</li>`}</ul>
      </div>
      <div class="rail-foot">
        <div class="legend-r">${PSTATUS.map(s=>`<span style="--c:${PCOR[s]}"><i></i>${s}</span>`).join("")}</div>
        <div class="acts"><a href="pedido.html" target="_blank" rel="noopener">formulário público ↗</a><button class="lk" data-act="sair">sair</button></div>
      </div>`;
  }

  /* ---------- PAINEL ---------- */
  function atencao(){
    const out=[], todos=allPedidos();
    todos.filter(p=>p.status==="recebido").forEach(p=>out.push({w:2+dias(p.criadoEm)/10, c:"var(--warn)", ic:"clock", t:p.titulo, s:`${p.codigo} · pedido de ${p.nome}, ${p.setor}`, why:`para triar · ${idade(p.criadoEm)}`, act:"open-ped", id:p.id}));
    todos.filter(p=>["em análise","aprovado"].includes(p.status) && dias(p.statusEm)>10).forEach(p=>out.push({w:1+dias(p.statusEm)/20, c:"var(--ink2)", ic:"pause", t:p.titulo, s:`${p.status} desde ${dataBr(p.statusEm)}`, why:`parado há ${dias(p.statusEm)} dias`, act:"open-ped", id:p.id}));
    todos.filter(p=>!["entregue","recusado"].includes(p.status) && p.precisaAte).forEach(p=>{ const d=diasAte(p.precisaAte); if (d!==null && d<=7) out.push({w:d<0?4:3, c:d<0?"var(--flag)":"var(--warn)", ic:"flag", t:p.titulo, s:`solicitante precisa até ${dataIso(p.precisaAte)}`, why:d<0?`data pedida passou há ${plural(-d,"dia")}`:d===0?"precisa hoje":`precisa em ${plural(d,"dia")}`, act:"open-ped", id:p.id}); });
    st.projetos.forEach(p=>{ const z=prazoP(p); if (z.late) out.push({w:5-z.d/100, c:"var(--flag)", ic:"alert", t:p.titulo||"projeto sem título", s:`projeto ${pst(p)}${p.responsavel?`, ${p.responsavel}`:""}`, why:z.t, act:"open-proj", id:p.id}); else if (z.soon) out.push({w:3.5, c:"var(--warn)", ic:"clock", t:p.titulo||"projeto sem título", s:`prazo ${dataIso(p.prazo)}`, why:z.t, act:"open-proj", id:p.id}); });
    return out.sort((a,b)=>b.w-a.w);
  }
  function vPainel(){
    const todos=allPedidos(), ps=st.projetos, novos=todos.filter(p=>p.novo);
    const nT=todos.filter(p=>p.status==="recebido").length, nF=todos.filter(p=>["em análise","aprovado"].includes(p.status)).length, nD=todos.filter(p=>p.status==="em desenvolvimento").length;
    const ativos=ps.filter(p=>["em andamento","testes"].includes(pst(p))).length, atras=ps.filter(p=>prazoP(p).late).length;
    const hoje=new Date().toLocaleDateString("pt-BR",{weekday:"long", day:"numeric", month:"long"});
    const att=atencao();
    const tile = (cls,c,act,attrs,label,n,sub) => `<button class="tile ${cls}" style="--c:${c}" data-act="${act}" ${attrs}><span class="tl">${label}</span><span class="tn">${n}</span><span class="ts">${sub}</span></button>`;
    return `
      <header class="vh"><div><p class="eyebrow">${esc(hoje)}</p><h1>painel</h1></div>
        <div class="vh-act"><button class="btn" data-act="nav" data-v="enviar">registrar pedido</button><button class="btn primary" data-act="new-proj">${I.send} novo projeto</button></div></header>
      ${!st.carregado?`<div class="hint">carregando dados…</div>`:""}
      ${novos.length?`<div class="banner"><span><b>${plural(novos.length,"pedido novo","pedidos novos")}</b> desde sua última visita${st.visto?` (${new Date(st.visto).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})})`:""}.</span><span style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm primary" data-act="ver-novos">ver pedidos</button><button class="btn sm" data-act="visto">marcar como vistos</button></span></div>`:""}
      <div class="tiles">
        ${tile(nT?"alert":"","var(--warn)","go-ped",'data-g="triar"',"pedidos para triar",nT, nT?"abrir a caixa de pedidos":"nada esperando triagem")}
        ${tile("","var(--accent2)","go-ped",'data-g="fila"',"na fila",nF+nD, `${nF} em análise ou aprovados, ${nD} em desenvolvimento`)}
        ${tile("","var(--accent2)","nav",'data-v="projetos"',"projetos ativos",`${ativos}<small> de ${ps.length}</small>`, "em andamento ou em testes")}
        ${tile(atras?"alert":"","var(--flag)","nav",'data-v="projetos"',"projetos atrasados",atras, atras?"prazo vencido":"todos dentro do prazo")}
      </div>
      <div class="dash">
        <section class="card"><div class="card-h"><h2>precisa de atenção</h2><span class="hint">${att.length?plural(att.length,"item","itens"):""}</span></div>
          ${att.length ? `<ul class="att">${att.slice(0,10).map(x=>`<li><button data-act="${x.act}" data-id="${esc(x.id)}" style="--c:${x.c}"><span class="ic">${I[x.ic]}</span><span style="min-width:0"><span class="tt" style="display:block">${esc(x.t)}</span><span class="ss">${esc(x.s)}</span></span><span class="why">${esc(x.why)}</span></button></li>`).join("")}</ul>${att.length>10?`<p class="hint" style="margin-top:8px">e mais ${att.length-10}. veja a caixa de pedidos e o quadro de projetos.</p>`:""}`
            : `<div class="empty">nada pendente agora. pedidos novos, pedidos parados há mais de 10 dias e prazos próximos aparecem aqui.</div>`}
        </section>
        <div class="dash-r">
          <section class="card"><div class="card-h"><h2>pedidos</h2>${todos.length?`<button class="btn ai sm" data-act="sum" ${st.sum?.busy?"disabled":""}>${I.spark} ${iaLbl("resumo da semana")}</button>`:""}</div>
            ${st.sum?`<div class="aibox" style="margin-bottom:16px"><div class="h"><span>resumo da semana</span><button class="btn sm" data-act="sum-x">${st.sum.busy?"parar":"fechar"}</button></div><div class="out ${st.sum.busy&&!st.sum.text?"thinking":""}" id="sum-out">${esc(st.sum.text||"pensando")}</div></div>`:""}
            ${charts(todos)}
          </section>
          <section class="card"><div class="card-h"><h2>definição dos projetos</h2></div>${kpis(ps)}</section>
        </div>
      </div>`;
  }
  function charts(todos){
    if (!todos.length) return `<div class="empty">nenhum pedido ainda. compartilhe o formulário público com os setores: ${esc(urlFormulario())}</div>`;
    const n=todos.length, cnt=Object.fromEntries(STATUS.map(x=>[x,todos.filter(p=>p.status===x).length])), vis=STATUS.filter(x=>cnt[x]);
    const por={}; todos.forEach(p=>{ const k=p.setor||"sem setor"; por[k]=(por[k]||0)+1; });
    const setores=Object.entries(por).sort((a,b)=>b[1]-a[1]).slice(0,6), max=setores[0][1];
    const now=Date.now(), W=7*DAY, sem=Array(8).fill(0);
    todos.forEach(p=>{ const i=Math.floor((now-(p.criadoEm||now))/W); if (i>=0&&i<8) sem[i]++; });
    const maxS=Math.max(...sem,1), primeiro=Math.min(...todos.map(p=>p.criadoEm||now)), semanas=Math.min(8,Math.max(1,Math.ceil((now-primeiro)/W)));
    const media=(sem.reduce((a,b)=>a+b,0)/semanas).toFixed(1).replace(".",",");
    return `
      <div class="chart"><h3>por status <small>${plural(n,"pedido")}</small></h3><div class="stack">${vis.map(x=>`<i style="width:${pct(cnt[x],n)}%;--c:${SCOR[x]}" title="${esc(x)}: ${cnt[x]}"></i>`).join("")}</div><div class="legend">${vis.map(x=>`<span style="--c:${SCOR[x]}">${esc(x)} <b>${cnt[x]}</b></span>`).join("")}</div></div>
      <div class="chart"><h3>por setor</h3><div class="hbars">${setores.map(([k,v])=>`<div class="hb"><span title="${esc(k)}">${esc(k)}</span>${bar(v,max)}<b>${v}</b></div>`).join("")}</div></div>
      <div class="chart"><h3>por semana <small>média de ${media} por semana</small></h3><div class="weeks">${sem.slice().reverse().map((v,k)=>{ const i=7-k; return `<div class="wk ${i===0?"now":""}"><span>${v||""}</span><div class="cb"><i style="height:${Math.round(v/maxS*100)}%"></i></div><span>${i===0?"esta":"-"+i}</span></div>`; }).join("")}</div></div>`;
  }
  function kpis(ps){
    if (!ps.length) return `<div class="empty">nenhum projeto ainda. crie um projeto ou transforme um pedido aprovado em projeto.</div>`;
    const tt=NT*ps.length, pr=ps.reduce((n,p)=>n+prontos(p),0);
    const cl=ps.reduce((n,p)=>n+ck(p).done,0), ct=ps.reduce((n,p)=>n+ck(p).total,0);
    const cnt=Object.fromEntries(PSTATUS.map(s=>[s,ps.filter(p=>pst(p)===s).length])), vis=PSTATUS.filter(s=>cnt[s]);
    return `<div class="kpis">
        <div class="kpi"><div class="kl"><span>tópicos definidos</span><b>${pct(pr,tt)}%</b></div>${bar(pr,tt)}<small>${pr} de ${tt} prontos, nas 4 etapas</small></div>
        <div class="kpi"><div class="kl"><span>pendências concluídas</span><b>${ct?pct(cl,ct):0}%</b></div>${bar(cl,ct)}<small>${cl} de ${ct}</small></div>
      </div>
      <div class="chart" style="margin-top:18px;padding-top:16px;border-top:1px solid var(--line)"><h3>projetos por status <small>${plural(ps.length,"projeto")}</small></h3><div class="stack">${vis.map(s=>`<i style="width:${pct(cnt[s],ps.length)}%;--c:${PCOR[s]}"></i>`).join("")}</div><div class="legend">${vis.map(s=>`<span style="--c:${PCOR[s]}">${s} <b>${cnt[s]}</b></span>`).join("")}</div></div>`;
  }

  /* ---------- PEDIDOS ---------- */
  function grupos(){
    const todos=allPedidos();
    const q=norm(st.busca);
    const all=todos.filter(p=>(!st.fTipo||p.tipo===st.fTipo)&&(!st.fSetor||p.setor===st.fSetor)&&(!q||norm(`${p.codigo} ${p.titulo} ${p.descricao} ${p.nome} ${p.plataforma}`).includes(q)));
    return {
      todos, all,
      triar: all.filter(p=>p.status==="recebido").sort((a,b)=>a.criadoEm-b.criadoEm),
      fila: all.filter(p=>["em análise","aprovado","em desenvolvimento"].includes(p.status)).sort((a,b)=>score(b).n-score(a).n || a.criadoEm-b.criadoEm),
      enc: all.filter(p=>["entregue","recusado"].includes(p.status)).sort((a,b)=>b.statusEm-a.statusEm)
    };
  }
  const GRP = {triar:["para triar","recebidos, do mais antigo ao mais novo"], fila:["fila priorizada","em análise, aprovados e em desenvolvimento, pela nota"], enc:["encerrados","entregues e recusados, do mais recente"], todos:["todos","todos os pedidos, do mais novo"]};
  const rowHtml = (p, act="sel-ped") => { const sc=score(p), v=vinculo(p), pr=v&&curP(v);
    return `<li><button class="row" data-act="${act}" data-id="${esc(p.id)}" aria-current="${p.id===st.selPed}">
      <span class="sc ${sc.est?"est":""}" title="${sc.est?"nota estimada":"nota de prioridade"}"><b>${sc.est?"~":""}${sc.n}</b><i>nota</i></span>
      <span class="rb"><span class="rt">${p.novo?`<span class="badge-new">novo</span> `:""}${esc(p.titulo)}</span><span class="rm"><span class="codigo">${esc(p.codigo)}</span><span class="chip">${esc(p.tipo)}</span><span>${esc(p.setor)} · ${esc(p.nome)}</span><span>${idade(p.criadoEm)}</span>${pr?`<span class="chip pj">${esc(pr.titulo||"projeto")}</span>`:""}</span></span>
      <span class="rs">${pill(p.status,SCOR[p.status])}${p.g.diretoria?`<span class="chip dir">diretoria</span>`:""}</span></button></li>`; };
  function vPedidos(){
    const g=grupos();
    const arr = st.grupo==="todos" ? [...g.all].sort((a,b)=>b.criadoEm-a.criadoEm) : g[st.grupo];
    const setores=[...new Set(g.todos.map(p=>p.setor).filter(Boolean))].sort();
    if (st.selPed && !g.todos.some(p=>p.id===st.selPed)) st.selPed=null;
    if (!st.selPed && arr.length && !matchMedia("(max-width:900px)").matches) st.selPed=arr[0].id;
    const empt = {triar:"nada esperando triagem.", fila:"nenhum pedido em análise, aprovado ou em desenvolvimento.", enc:"nenhum pedido encerrado.", todos:"nenhum pedido encontrado."}[st.grupo];
    return `
      <header class="vh"><div><p class="eyebrow">caixa de pedidos</p><h1>pedidos</h1><p class="sub">triagem, prioridade e acompanhamento do que os setores pedem.</p></div>
        <div class="vh-act"><button class="btn" data-act="pesos" aria-expanded="${st.pesosOpen}">pesos da nota</button><button class="btn primary" data-act="nav" data-v="enviar">registrar pedido</button></div></header>
      ${st.pesosOpen?`<div class="pesos"><div class="g3">
          <label class="f">pedido da diretoria<input type="number" min="0" max="100" id="w-diretoria" data-peso="diretoria" value="${st.pesos.diretoria}"></label>
          <label class="f">esforço (menor é melhor)<input type="number" min="0" max="100" id="w-esforco" data-peso="esforco" value="${st.pesos.esforco}"></label>
          <label class="f">impacto<input type="number" min="0" max="100" id="w-impacto" data-peso="impacto" value="${st.pesos.impacto}"></label></div>
          <p class="hint">a nota vai de 0 a 100 e os pesos são relativos entre si. enquanto esforço ou impacto não forem avaliados, a nota aparece com “~” e usa valor médio.</p></div>`:""}
      <div class="toolbar">
        <div class="seg" role="group" aria-label="grupo">${["triar","fila","enc","todos"].map(k=>`<button data-act="grupo" data-g="${k}" aria-pressed="${st.grupo===k}">${GRP[k][0]}<span class="n">${k==="todos"?g.all.length:g[k].length}</span></button>`).join("")}</div>
        <input class="grow" type="search" id="f-busca" placeholder="buscar por protocolo, título, nome ou plataforma" value="${esc(st.busca)}" aria-label="buscar pedidos">
        <select id="f-tipo" aria-label="filtrar por tipo"><option value="">todos os tipos</option>${TIPOS.map(t=>`<option ${t===st.fTipo?"selected":""}>${t}</option>`).join("")}</select>
        <select id="f-setor" aria-label="filtrar por setor"><option value="">todos os setores</option>${setores.map(s=>`<option ${s===st.fSetor?"selected":""}>${esc(s)}</option>`).join("")}</select>
      </div>
      <div class="split ${st.selPed?"has-sel":""}">
        <div class="list-pane"><p class="grp-h">${GRP[st.grupo][1]}</p>${arr.length?`<ul class="rows">${arr.map(p=>rowHtml(p)).join("")}</ul>`:`<div class="card empty">${!st.carregado?"carregando…":empt}</div>`}</div>
        <aside class="det" id="det" aria-label="detalhe do pedido">${detPedido()}</aside>
      </div>`;
  }
  function detPedido(){
    const p = allPedidos().find(x=>x.id===st.selPed);
    if (!p) return `<div class="place">${I.inbox}<b>escolha um pedido na lista</b><span>para avaliar, priorizar e decidir o próximo passo.</span></div>`;
    const g=p.g, sc=score(p), a=st.ai[p.id]||{}, vid=vinculo(p), proj=vid&&curP(vid), sug=sugestaoProjeto(p);
    const nexts = NEXT[p.status]||[];
    return `<div class="det-in">
      <button class="btn sm back" data-act="desel-ped">← voltar à lista</button>
      <div>
        <div class="rm" style="margin-bottom:8px"><span class="codigo">${esc(p.codigo)}</span><span class="chip">${esc(p.tipo)}</span>${g.diretoria?`<span class="chip dir">diretoria</span>`:""}${pill(p.status,SCOR[p.status])}</div>
        <h2>${esc(p.titulo)}</h2>
        <p class="meta">de ${esc(p.nome)}, ${esc(p.setor)}. enviado em ${dataBr(p.criadoEm)}${p.precisaAte?`. precisa até ${dataIso(p.precisaAte)}`:""}${p.plataforma?`. plataforma: ${esc(p.plataforma)}`:""}</p>
      </div>
      ${p.descricao?`<div class="desc">${esc(p.descricao)}</div>`:`<div class="empty">sem descrição.</div>`}
      ${trackHtml(p.status, p.hist)}

      <section class="blk"><h3>decisão</h3>
        ${st.recusando===p.id ? `<label class="f">motivo da recusa (o solicitante vê esta mensagem)<textarea id="d-recmsg" data-keep data-draft maxlength="600" placeholder="explique por que o pedido não vai seguir e, se houver, a alternativa">${esc(p.msg)}</textarea></label>
            <div class="decide"><button class="btn danger solid" data-act="recusar-ok" data-id="${esc(p.id)}">confirmar recusa</button><button class="btn" data-act="recusar-x">cancelar</button></div>`
          : `<div class="decide">${nexts.map(([s,t,c])=>`<button class="btn ${c}" data-act="${s==="recusado"?"recusar":"set-st"}" data-s="${s}" data-id="${esc(p.id)}">${t}</button>`).join("")}
            ${p.status==="aprovado"&&!proj?`<button class="btn" data-act="virar-proj" data-id="${esc(p.id)}">virar projeto</button>`:""}
            <select id="d-status" aria-label="mudar status manualmente">${STATUS.map(s=>`<option ${s===p.status?"selected":""}>${s}</option>`).join("")}</select></div>`}
        <label class="f">mensagem ao solicitante (aparece no acompanhamento dele)<textarea id="d-msg" data-keep maxlength="600" rows="2" style="min-height:60px" placeholder="opcional: combine prazos, peça informações ou explique a decisão">${esc(p.msg)}</textarea></label>
      </section>

      <section class="blk"><h3>prioridade</h3>
        <div class="nota"><b>${sc.est?"~":""}${sc.n}</b><div class="nb">${bar(sc.n,100)}<span>${sc.est?"nota estimada: avalie esforço e impacto para fechar":"nota de prioridade, de 0 a 100"}</span></div></div>
        <div class="g2">
          <label class="f">esforço de desenvolvimento<select id="d-esf"><option value="">sem avaliação</option>${ESF.slice(1).map((t,k)=>`<option value="${k+1}" ${g.esforco===k+1?"selected":""}>${k+1}. ${t}</option>`).join("")}</select></label>
          <label class="f">impacto<select id="d-imp"><option value="">sem avaliação</option>${IMP.slice(1).map((t,k)=>`<option value="${k+1}" ${g.impacto===k+1?"selected":""}>${k+1}. ${t}</option>`).join("")}</select></label>
          <label class="chk full"><input type="checkbox" id="d-dir" ${g.diretoria?"checked":""}> pedido da diretoria</label>
        </div>
        <div class="decide"><button class="btn ai sm" data-act="ai-sug" data-id="${esc(p.id)}" ${a.sug?.busy?"disabled":""}>${I.spark} ${iaLbl("sugerir esforço e impacto")}</button><button class="btn ai sm" data-act="ai-dup" data-id="${esc(p.id)}" ${a.dup?.busy?"disabled":""}>${I.spark} ${iaLbl("procurar pedidos parecidos")}</button></div>
        ${a.sug ? `<div class="aibox"><div class="h"><span>sugestão da ia</span><button class="btn sm" data-act="ai-x" data-k="sug" data-id="${esc(p.id)}">fechar</button></div>
          ${a.sug.busy?`<div class="out thinking">pensando</div>`: a.sug.err?`<div class="out">${esc(a.sug.err)}</div>`:`<div class="out">esforço ${a.sug.esforco} (${esc(ESF[a.sug.esforco])}) e impacto ${a.sug.impacto} (${esc(IMP[a.sug.impacto])}).\n${esc(a.sug.motivo)}</div><div><button class="btn sm primary" data-act="ai-sug-ok" data-id="${esc(p.id)}">aplicar</button></div>`}</div>` : ""}
        ${a.dup ? `<div class="aibox"><div class="h"><span>pedidos parecidos</span><button class="btn sm" data-act="ai-x" data-k="dup" data-id="${esc(p.id)}">fechar</button></div>
          ${a.dup.busy?`<div class="out thinking">comparando</div>`: a.dup.err?`<div class="out">${esc(a.dup.err)}</div>`: a.dup.items.length ? `<div class="sugg">${a.dup.items.map(x=>`<button class="pick" data-act="sel-ped" data-id="${esc(x.id)}"><span>${esc(x.titulo)}</span><small>${esc(x.status)}. ${esc(x.motivo)}</small></button>`).join("")}</div>` : `<div class="out">nenhum pedido parecido encontrado.</div>`}</div>` : ""}
      </section>

      <section class="blk"><h3>projeto</h3>
        ${proj ? `<div>vinculado ao projeto <b>${esc(proj.titulo||"sem título")}</b> ${pill(pst(proj),PCOR[pst(proj)])}</div><div class="decide"><button class="btn sm" data-act="open-proj" data-id="${esc(proj.id)}">abrir projeto</button><button class="btn sm ghost" data-act="unlink" data-id="${esc(p.id)}">desvincular</button></div>`
          : `${sug?`<div class="msg"><b>sugestão</b>o pedido cita “${esc(p.plataforma)}”, parecido com o projeto ${esc(sug.titulo)}. <button class="lnk" data-act="link" data-id="${esc(p.id)}" data-pid="${esc(sug.id)}">vincular a ele</button></div>`:""}
             <div class="vrow"><select id="d-vsel" aria-label="projeto existente"><option value="">vincular a um projeto existente</option>${[...st.projetos].sort((x,y)=>low(x.titulo).localeCompare(low(y.titulo))).map(x=>`<option value="${esc(x.id)}">${esc(x.titulo||"projeto sem título")} (${esc(pst(x))})</option>`).join("")}</select><button class="btn sm" data-act="link-sel" data-id="${esc(p.id)}">vincular</button></div>
             <div><button class="btn primary sm" data-act="virar-proj" data-id="${esc(p.id)}">criar projeto a partir deste pedido</button></div>`}
      </section>

      <section class="blk"><h3>uso interno</h3>
        <label class="f">prazo previsto (só você vê)<input type="date" id="d-prazo" value="${esc(g.prazo||"")}"></label>
        <label class="f">notas internas (o solicitante não vê)<textarea id="d-notas" data-keep placeholder="decisões, dúvidas, contatos">${esc(g.notas||"")}</textarea></label>
        <div style="display:flex;justify-content:flex-end"><button class="btn ghost" data-act="del-ped" data-id="${esc(p.id)}">excluir pedido</button></div>
      </section>
    </div>`;
  }

  /* ---------- PROJETOS ---------- */
  function vProjetos(){
    const q=norm(st.projBusca), list=sortedP().filter(p=>!q||norm(`${p.titulo} ${p.responsavel} ${p.objetivo}`).includes(q));
    const card = p => { const z=prazoP(p), c=ck(p), np=pedidosDoProjeto(p.id).length;
      return `<button class="pc" data-act="open-proj" data-id="${esc(p.id)}"><span class="t">${esc(p.titulo||"projeto sem título")}</span>
        ${bar(prontos(p)+c.done, NT+c.total, true)}
        <span class="m"><span>${andamento(p)}% · ${prontos(p)}/${NT} tópicos</span>${p.prazo?`<span class="${z.late?"late":z.soon?"soon":""}">${z.t||dataIso(p.prazo)}</span>`:`<span>sem prazo</span>`}</span>
        <span class="m"><span>${esc(p.responsavel||"sem responsável")}</span>${np?`<span>${plural(np,"pedido")}</span>`:""}</span></button>`; };
    return `
      <header class="vh"><div><p class="eyebrow">portfólio</p><h1>projetos</h1><p class="sub">${plural(st.projetos.length,"projeto")}. cada um passa por 4 etapas de definição com ${NT} tópicos antes e durante a execução.</p></div>
        <div class="vh-act"><button class="btn primary" data-act="new-proj">${I.send} novo projeto</button></div></header>
      <div class="toolbar">
        <div class="seg" role="group" aria-label="visualização"><button data-act="pmodo" data-m="quadro" aria-pressed="${st.projModo==="quadro"}">quadro</button><button data-act="pmodo" data-m="lista" aria-pressed="${st.projModo==="lista"}">lista</button></div>
        <input class="grow" type="search" id="p-busca" placeholder="buscar por título, responsável ou objetivo" value="${esc(st.projBusca)}" aria-label="buscar projetos">
      </div>
      ${!st.projetos.length ? `<div class="card place">${I.board}<b>${st.carregado?"nenhum projeto ainda":"carregando…"}</b><span>crie um projeto ou transforme um pedido aprovado em projeto.</span><button class="btn primary" data-act="new-proj">novo projeto</button></div>`
       : st.projModo==="quadro" ? `<div class="board">${PSTATUS.map(s=>{ const l=list.filter(p=>pst(p)===s); return `<section class="col" aria-label="${s}"><div class="col-h" style="--c:${PCOR[s]}">${s}<span>${l.length}</span></div>${l.length?l.map(card).join(""):`<div class="none">nenhum</div>`}</section>`; }).join("")}</div>`
       : `<div class="tblwrap"><table class="ptable"><thead><tr><th>projeto</th><th>status</th><th>responsável</th><th>prazo</th><th>andamento</th><th>pedidos</th></tr></thead><tbody>${list.map(p=>{ const z=prazoP(p); return `<tr data-act="open-proj" data-id="${esc(p.id)}" tabindex="0"><td><b>${esc(p.titulo||"projeto sem título")}</b></td><td>${pill(pst(p),PCOR[pst(p)])}</td><td>${esc(p.responsavel||"–")}</td><td class="n" style="${z.late?"color:var(--flag);font-weight:600":""}">${p.prazo?dataIso(p.prazo):"–"}${z.t?`<br><small class="mut">${z.t}</small>`:""}</td><td class="n" style="min-width:120px">${andamento(p)}% ${bar(andamento(p),100,true)}</td><td class="n">${pedidosDoProjeto(p.id).length||"–"}</td></tr>`; }).join("")}</tbody></table></div>`}`;
  }

  /* ---------- PROJETO ---------- */
  function vProjeto(){
    const p=curP(st.selProj);
    if (!p) return `<div class="crumb"><button class="lnk" data-act="nav" data-v="projetos">projetos</button></div><div class="card place">${I.board}<b>${!st.carregado?"carregando…":"projeto não encontrado"}</b><span>escolha um projeto no quadro ou crie um novo.</span></div>`;
    const c=ck(p), pr=prontos(p), stv=pst(p), z=prazoP(p), nped=pedidosDoProjeto(p.id).length, ndoc=(p.docs||[]).length+(p.links||[]).length;
    const d0=p.prazo?new Date(p.prazo+"T12:00:00"):null, okd=d0&&!isNaN(d0);
    const tab = (k,t,n) => `<button role="tab" data-act="ptab" data-t="${k}" aria-selected="${st.projTab===k}">${t}${n!=null?`<span class="n">${n}</span>`:""}</button>`;
    const body = {geral:pGeral, definicoes:pDefinicoes, docs:pDocs, pedidos:pPedidos}[st.projTab] || pGeral;
    return `
      <div class="crumb"><button class="lnk" data-act="nav" data-v="projetos">projetos</button><span>/</span><span>${esc(p.titulo||"projeto sem título")}</span></div>
      <header class="ph">
        <div class="ph-l">
          <input class="title-in" id="f-titulo" data-keep value="${esc(p.titulo)}" aria-label="título do projeto" maxlength="120">
          <textarea class="obj" id="f-objetivo" data-keep rows="2" aria-label="objetivo do projeto" placeholder="objetivo em uma frase: o que precisa entregar e para quê">${esc(p.objetivo)}</textarea>
          <div class="ph-meta">
            <label class="fld" title="responsável">${I.user}<input id="f-responsavel" data-keep value="${esc(p.responsavel)}" placeholder="responsável" aria-label="responsável" maxlength="80"></label>
            <label class="fld" title="link da plataforma">${I.link}<input id="f-plink" data-keep value="${esc(p.plataforma_url||"")}" placeholder="link da plataforma" aria-label="link da plataforma" maxlength="500">${p.plataforma_url?`<a href="${esc(p.plataforma_url)}" target="_blank" rel="noopener">abrir</a>`:""}</label>
          </div>
          ${p.origem?`<div class="origem">origem: pedido de ${esc(p.origem.nome)} (${esc(p.origem.setor)}). ${p.origem.pedidoId&&rowPed(p.origem.pedidoId)?`<button class="lnk" data-act="open-ped" data-id="${esc(p.origem.pedidoId)}">ver pedido</button>`:""}</div>`:""}
        </div>
        <div class="ph-r">
          <div class="stsel" style="--c:${PCOR[stv]}"><span>${esc(stv)}</span>${I.chev}<select id="f-status" aria-label="status do projeto">${PSTATUS.map(x=>`<option ${x===stv?"selected":""}>${x}</option>`).join("")}</select></div>
          <div style="position:relative">
            <button class="cal ${z.late?"late":""}" data-act="cal" aria-label="alterar o prazo">
              <span class="calblk">${okd?`<b>${d0.getDate()}</b><span>${d0.toLocaleDateString("pt-BR",{month:"short"}).replace(".","")}</span><span>${d0.getFullYear()}</span>`:`<b>–</b><span>sem prazo</span>`}</span>
              <span class="caltx">${okd?`<b>${stv==="concluído"?"concluído":z.late?"atrasado":z.d===0?"vence hoje":"no prazo"}</b>${z.t?`<small>${z.t}</small>`:""}`:`<b>definir prazo</b><small>clique para escolher</small>`}</span>
            </button>
            <input type="date" id="f-prazo" class="hiddate" value="${esc(p.prazo||"")}" aria-label="prazo do projeto" tabindex="-1">
          </div>
        </div>
        <div class="prog"><div class="pl"><span>andamento do projeto</span><b>${andamento(p)}%</b></div>${bar(pr+c.done,NT+c.total)}<small class="mut">tópicos prontos ${pr} de ${NT}${c.total?`, pendências ${c.done} de ${c.total}`:", nenhuma pendência listada"}</small></div>
      </header>
      <nav class="tabs" role="tablist">${tab("geral","visão geral")}${tab("definicoes","definições",`${pr}/${NT}`)}${tab("docs","documentos",ndoc)}${tab("pedidos","pedidos",nped)}</nav>
      ${body(p)}
      <div class="decide" style="justify-content:space-between;color:var(--ink3);font-size:.82rem"><span>${p.atualizado_em?`atualizado em ${new Date(p.atualizado_em).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}`:""}</span><button class="btn ghost" data-act="del-proj">excluir projeto</button></div>`;
  }
  function pGeral(p){
    const list=p.checklist||[], ai=st.aiProj[p.id]||{}, at=etapaAtual(p), prox=at&&faltam(p,at)[0];
    return `<div class="ov">
      <section class="card"><div class="card-h"><h2>checklist</h2><span class="hint">${ck(p).done} de ${list.length}</span></div>
        <div class="addrow" style="margin-bottom:10px"><input id="new-item" data-draft placeholder="nova pendência e enter" maxlength="200" aria-label="nova pendência"><button class="btn sm" data-act="ck-add">adicionar</button><button class="btn ai sm" data-act="ai-check" ${ai.busy?"disabled":""}>${I.spark} ${IA.integrada()?"sugerir":"sugerir (copiar)"}</button></div>
        ${ai.kind==="check"?`<div class="aibox" style="margin-bottom:10px"><div class="h"><span>sugestões da ia</span><span style="display:flex;gap:6px"><button class="btn sm" data-act="ai-add-all" ${ai.items?.length?"":"disabled"}>adicionar todas</button><button class="btn sm" data-act="aip-x">fechar</button></span></div>
          ${ai.busy?`<div class="out thinking">pensando</div>`:ai.error?`<div class="out">${esc(ai.error)}</div>`:`<div class="sugg">${(ai.items||[]).map((t,k)=>`<div class="pick" style="flex-direction:row;justify-content:space-between;align-items:center;cursor:default"><span>${esc(t)}</span><button class="btn sm" data-act="ai-add" data-k="${k}">adicionar</button></div>`).join("")}</div>`}</div>`:""}
        ${list.length?`<ul class="check">${list.map(i=>`<li class="${i.feito?"done":""}"><input type="checkbox" data-ck="${esc(i.id)}" ${i.feito?"checked":""} aria-label="concluir"><input class="txt" id="ck-${esc(i.id)}" data-keep data-cktxt="${esc(i.id)}" value="${esc(i.texto)}" aria-label="pendência"><button class="btn ghost sm" data-act="ck-del" data-id="${esc(i.id)}" aria-label="remover pendência">✕</button></li>`).join("")}</ul>`:`<div class="empty">nada listado ainda. escreva acima ou peça sugestões à ia.</div>`}
      </section>
      <div class="ov-r">
        <section class="card"><div class="card-h"><h2>próximo passo na definição</h2></div>
          ${prox?`<div class="next"><span class="k">${esc(at.t)} · faltam ${faltam(p,at).length} de ${at.topicos.length} tópicos</span><b>${esc(prox.t)}</b><span class="hint">${esc(prox.itens.join("; "))}.</span><div><button class="btn primary sm" data-act="topic" data-k="${prox.k}">definir agora</button></div></div>`
                :`<div class="next"><b>as 4 etapas estão concluídas.</b><span class="hint">o projeto está definido e pronto para execução.</span></div>`}
        </section>
        <section class="card"><div class="card-h"><h2>lacunas do projeto</h2><button class="btn ai sm" data-act="ai-analyze" ${ai.busy?"disabled":""}>${I.spark} ${iaLbl("apontar o que falta")}</button></div>
          <p class="hint">a ia lê os ${NT} tópicos, o checklist e as observações e aponta o que ainda não foi respondido, os riscos e os próximos passos.</p>
          ${ai.kind==="analyze"?`<div class="aibox" style="margin-top:12px"><div class="h"><span>análise da ia</span><button class="btn sm" data-act="aip-x">${ai.busy?"parar":"fechar"}</button></div><div class="out ${ai.busy&&!ai.text?"thinking":""}" id="an-out">${esc(ai.text||"pensando")}</div></div>`:""}
        </section>
        <section class="card"><div class="card-h"><h2>observações</h2></div>
          <textarea id="f-notas" data-keep aria-label="observações" placeholder="decisões, riscos, contatos">${esc(p.notas)}</textarea>
          <label class="chk" style="margin-top:12px"><input type="checkbox" id="f-pub" ${p.publico!==false?"checked":""}> aparece na lista de plataformas do formulário de feedback</label>
        </section>
      </div></div>`;
  }
  const etapaTag = (p,e) => { const n=etapaN(p,e); if (n===e.topicos.length) return "concluída"; const at=etapaAtual(p); if (at && e.k===at.k) return "etapa atual"; return e.topicos.some(t=>stT(p,t.k)!=="pendente"||(p.etapas?.[t.k]?.txt||"").trim()) ? "adiantada" : "a seguir"; };
  function pDefinicoes(p){
    const at=etapaAtual(p), sel=TOP[st.selTopic]?st.selTopic:null;
    const stages = `<div class="stages">${ETAPAS.map(e=>{ const n=etapaN(p,e), tag=etapaTag(p,e); return `<section class="stg ${at&&at.k===e.k?"cur":""} ${n===e.topicos.length?"done":""}"><div class="stg-h"><b>${esc(e.t)}</b><span class="tag">${tag}</span></div>${bar(n,e.topicos.length,true)}<small class="mut">${n} de ${e.topicos.length} prontos</small>
        <ul class="tlist">${e.topicos.map(t=>`<li><button class="tcell ${sel===t.k?"on":""}" data-act="topic" data-k="${t.k}" title="${esc(trecho(p,t.k,200))}"><i class="tdot ${spCls(stT(p,t.k))}" aria-hidden="true"></i><span>${esc(t.t)}</span><span class="sr">${stT(p,t.k)}</span></button></li>`).join("")}</ul></section>`; }).join("")}</div>`;
    const legend = `<div class="vt"><span><i class="tdot" style="display:inline-block;vertical-align:-2px"></i> pendente</span><span><i class="tdot a" style="display:inline-block;vertical-align:-2px"></i> em andamento</span><span><i class="tdot p" style="display:inline-block;vertical-align:-2px"></i> pronto</span><span>· dá para abrir qualquer tópico, de qualquer etapa.</span></div>`;
    return stages + legend + (sel ? editor(p, TOP[sel]) : "");
  }
  function editor(p,t){
    const v=p.etapas?.[t.k]||{}, busy=st.aiTop[p.id+":"+t.k], rel=RELS[t.k]||[], e=etapaDe(t.k), i=TOPICOS.indexOf(t), cur=v.st||"pendente";
    const prev=TOPICOS[i-1], next=TOPICOS[i+1];
    return `<section class="editor" id="editor" aria-label="${esc(t.t)}">
      <div class="ed-h"><h3>${esc(t.t)}<small>${esc(e.t)} · tópico ${i+1} de ${NT}</small></h3>
        <div class="seg" role="group" aria-label="status do tópico">${TST.map(s=>`<button data-act="tst" data-k="${t.k}" data-s="${s}" aria-pressed="${s===cur}">${s}</button>`).join("")}</div></div>
      <div class="roteiro" aria-label="roteiro">${t.itens.map(x=>`<span>${esc(x)}</span>`).join("")}</div>
      <textarea id="tx-${t.k}" data-keep data-tx="${t.k}" maxlength="4000" placeholder="responda aqui o que o roteiro pede">${esc(v.txt||"")}</textarea>
      ${rel.length?`<div class="vt"><span>ver também:</span>${rel.map(r=>`<button class="rel" data-act="topic" data-k="${r}" title="${esc(trecho(p,r,200))}"><i class="tdot ${spCls(stT(p,r))}" aria-hidden="true"></i>${esc(TOP[r].t)}</button>`).join("")}</div>`:""}
      <div class="ed-f">
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ai sm" data-act="ai-top" data-k="${t.k}" ${busy?"disabled":""}>${I.spark} ${busy?"rascunhando…":iaLbl("rascunhar com ia")}</button><button class="btn sm" data-act="topic-x">fechar</button></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${prev?`<button class="btn sm" data-act="topic" data-k="${prev.k}">← anterior</button>`:""}${cur!=="pronto"?`<button class="btn primary sm" data-act="topic-done" data-k="${t.k}">marcar pronto${next?" e seguir":""}</button>`:next?`<button class="btn sm" data-act="topic" data-k="${next.k}">próximo →</button>`:""}</div>
      </div></section>`;
  }
  function pDocs(p){
    const itens=[...(p.docs||[]).map(d=>({k:"doc",...d})), ...(p.links||[]).map(l=>({k:"link",...l}))].sort((a,b)=>(b.em||0)-(a.em||0));
    return `<section class="card"><div class="card-h"><h2>adicionar</h2><div class="seg" role="group" aria-label="tipo"><button data-act="dkind" data-k="link" aria-pressed="${st.docKind==="link"}">link</button><button data-act="dkind" data-k="arq" aria-pressed="${st.docKind==="arq"}">arquivo</button></div></div>
      ${st.docKind==="link" ? `<div class="addrow"><input id="lk-t" data-draft placeholder="título (opcional)" maxlength="80" style="flex:1 1 160px"><input id="lk-u" data-draft placeholder="endereço, ex.: https://…" maxlength="500" style="flex:2 1 240px"><button class="btn primary sm" data-act="lk-add">adicionar link</button></div>`
        : `<div class="addrow"><input type="file" id="doc-file" multiple><button class="btn primary sm" data-act="doc-up">anexar</button></div><p class="hint" style="margin-top:8px">qualquer tipo de arquivo, até 50 mb cada. o plano gratuito guarda até 1 gb no total.</p>`}
      </section>
      ${itens.length ? `<ul class="flist">${itens.map(i=> i.k==="doc"
        ? `<li><span class="ico">${svgDoc(i.nome)}</span><span class="fn"><a href="#" data-act="doc-open" data-path="${esc(i.path)}">${esc(i.nome)}</a><small>${[fmtSize(i.tamanho),dataBr(i.em)].filter(Boolean).join(" · ")}</small></span><button class="btn ghost sm" data-act="doc-del" data-id="${esc(i.id)}" aria-label="remover documento">✕</button></li>`
        : `<li><span class="ico" style="width:30px">${I.link}</span><span class="fn"><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.titulo||host(i.url))}</a><small>${esc(host(i.url))}</small></span><button class="btn ghost sm" data-act="lk-del" data-id="${esc(i.id)}" aria-label="remover link">✕</button></li>`).join("")}</ul>`
        : `<div class="empty">nada anexado ainda.</div>`}`;
  }
  function pPedidos(p){
    const l=pedidosDoProjeto(p.id);
    return l.length ? `<ul class="rows">${l.map(x=>rowHtml(x,"open-ped")).join("")}</ul>`
      : `<div class="card empty">nenhum pedido ou feedback vinculado. vincule pela caixa de pedidos ou deixe o solicitante escolher esta plataforma ao enviar um feedback.</div>`;
  }

  /* ---------- REGISTRAR PEDIDO ---------- */
  function vEnviar(){
    const fb=st.tipo==="feedback de plataforma", publicos=st.projetos.filter(p=>p.publico!==false).sort((a,b)=>low(a.titulo).localeCompare(low(b.titulo)));
    const hasCat=publicos.length>0, sel=st.formPlat, outra=!hasCat||sel==="_outra";
    return `
      <header class="vh"><div><p class="eyebrow">caixa de pedidos</p><h1>registrar pedido</h1><p class="sub">use para registrar pedidos que chegaram por outro canal, como conversa, e-mail ou mensagem.</p></div>
        <div class="vh-act"><button class="btn" data-act="nav" data-v="pedidos">ir para a caixa de pedidos</button></div></header>
      <div class="egrid">
        <form class="card form" id="pform" novalidate>
          <div class="seg" role="group" aria-label="tipo de pedido">${TIPOS.map(t=>`<button type="button" data-act="tipo" data-v="${t}" aria-pressed="${t===st.tipo}">${t}</button>`).join("")}</div>
          <div class="g2">
            <label class="f">setor<select id="r-setor" data-draft><option value="">escolha</option>${SETORES.map(s=>`<option>${s}</option>`).join("")}</select></label>
            <label class="f">nome do solicitante<input id="r-nome" data-draft data-keep maxlength="60"></label>
          </div>
          ${fb&&hasCat?`<label class="f">sobre qual plataforma?<select id="r-proj"><option value="">escolha</option>${publicos.map(c=>`<option value="${esc(c.id)}" ${sel===c.id?"selected":""}>${esc(c.titulo)}</option>`).join("")}<option value="_outra" ${sel==="_outra"?"selected":""}>outra, não está na lista</option></select></label>`:""}
          ${fb&&outra?`<label class="f">nome da plataforma<input id="r-plat" data-draft data-keep maxlength="80"></label>`:""}
          <label class="f">título<input id="r-title" data-draft data-keep maxlength="140" placeholder="resuma em uma linha"></label>
          <label class="f">descrição<textarea id="r-desc" data-draft data-keep maxlength="1500" placeholder="o que precisa, por que e como isso é feito hoje"></textarea></label>
          <label class="f">precisa até (opcional)<input type="date" id="r-date" data-draft></label>
          <div><button class="btn primary" type="submit" id="r-send">registrar pedido</button></div>
        </form>
        <section class="card"><div class="card-h"><h2>formulário público</h2></div>
          <p class="hint" style="margin-bottom:12px">envie este link aos setores. não precisa de login: a pessoa preenche, recebe um protocolo e acompanha o andamento pelo próprio link.</p>
          <div class="copyrow"><input readonly id="pub-link" value="${esc(urlFormulario())}" aria-label="link do formulário público"><button class="btn sm" data-act="copiar-form">copiar</button><a class="btn sm" href="pedido.html" target="_blank" rel="noopener">abrir</a></div>
        </section>
      </div>`;
  }

  /* ---------- AJUSTES ---------- */
  function vAjustes(){
    const k=IA.chave();
    return `
      <header class="vh"><div><p class="eyebrow">configurações</p><h1>ajustes</h1></div></header>
      <div class="egrid">
        <section class="card form"><div class="card-h"><h2>inteligência artificial</h2>${pill(k?"integrada":"copiar para o Claude", k?"var(--ok)":"var(--ink2)")}</div>
          <p class="hint">sem chave, os botões de ia copiam um prompt pronto e abrem o Claude para você colar. custo zero.</p>
          <p class="hint">com uma chave da API da Anthropic, a resposta aparece dentro da plataforma (modelo ${esc(IA.MODELO)}, cobrado por uso na sua conta da API). a chave fica salva só neste navegador.</p>
          <label class="f">chave da API<input type="password" id="ia-key" placeholder="sk-ant-…" value="${esc(k)}" autocomplete="off"></label>
          <div class="set-row"><button class="btn primary sm" data-act="ia-salvar">salvar chave</button>${k?`<button class="btn ghost sm" data-act="ia-remover">remover chave</button>`:""}</div>
        </section>
        <div class="ov-r">
          <section class="card form"><div class="card-h"><h2>backup</h2></div>
            <p class="hint">baixe uma cópia de todos os pedidos, projetos e ajustes em um arquivo. guarde no OneDrive. os arquivos anexados aos projetos não entram nesta cópia.</p>
            <div class="set-row"><button class="btn primary sm" data-act="exportar">baixar backup</button>
              <label class="btn sm" for="imp-file" style="cursor:pointer">restaurar de um arquivo</label><input type="file" id="imp-file" accept="application/json,.json" hidden></div>
          </section>
          <section class="card form"><div class="card-h"><h2>conta</h2></div>
            <p>conectado como <b>${esc(st.user?.email||"")}</b>.</p>
            <div class="set-row"><button class="btn sm" data-act="sair">sair</button></div>
          </section>
        </div>
      </div>`;
  }

  /* ---------- ações ---------- */
  const formVals = () => { const f={}; ["r-setor","r-nome","r-title","r-desc","r-date","r-plat","r-proj"].forEach(id=>{ const el=document.getElementById(id); if (el) f[id]=el.value; }); return f; };

  async function novoProjeto(){
    const now=new Date().toISOString();
    try{
      const row = await run(sb.from("projetos").insert({titulo:"novo projeto", etapas:etapasVazias(), criado_em:now, atualizado_em:now}).select().single());
      st.projetos.push(row);
      go("projeto",{selProj:row.id, projTab:"geral", selTopic:null}); setTimeout(()=>{ const t=$("#f-titulo"); t?.focus(); t?.select(); },60);
    }catch{}
  }
  async function virarProjeto(p){
    try{
      const row = await run(sb.from("projetos").insert({titulo:p.titulo, objetivo:p.descricao||"", prazo:p.g.prazo||null, etapas:etapasVazias(), notas:`origem: pedido ${p.codigo} de ${p.nome} (${p.setor}).`, origem:{pedidoId:p.id, codigo:p.codigo, nome:p.nome, setor:p.setor}}).select().single());
      st.projetos.push(row);
      await patchPed(p.id, {projeto_id:row.id});
      if (["recebido","em análise"].includes(p.status)) await setStatus(p.id, "aprovado");
      toast("projeto criado a partir do pedido");
      go("projeto",{selProj:row.id, projTab:"geral", selTopic:null});
    }catch{}
  }
  async function mudarStatusProjeto(p, v, sel){
    if (["em andamento","testes","concluído"].includes(v)){
      const alvo = v==="concluído" ? ETAPAS : ETAPAS.slice(0,3), falta = alvo.flatMap(e=>faltam(p,e));
      if (falta.length && !(await ask({title:`mudar para “${v}”?`, body:`ainda faltam ${plural(falta.length,"tópico")} prontos ${v==="concluído"?"nas 4 etapas":"nas etapas 1 a 3"}: ${falta.slice(0,6).map(t=>t.t).join(", ")}${falta.length>6?"…":""}.`, ok:"mudar mesmo assim"}))){ if (sel) sel.value=pst(p); return; }
    }
    await updP(p,{status:v});
    const ped=p.origem?.pedidoId, novo=SYNC[v];
    if (ped && novo && rowPed(ped) && rowPed(ped).status!==novo){ await setStatus(ped, novo); toast(`status do pedido de origem atualizado para “${novo}”`); }
    render();
  }
  async function registrar(){
    const f=formVals(), setor=f["r-setor"], nome=(f["r-nome"]||"").trim(), titulo=(f["r-title"]||"").trim();
    if (!setor){ toast("escolha o setor."); $("#r-setor").focus(); return; }
    if (!nome){ toast("informe o nome do solicitante."); $("#r-nome").focus(); return; }
    if (!titulo){ toast("dê um título ao pedido."); $("#r-title").focus(); return; }
    let plataforma="", projetoId=null;
    if (st.tipo==="feedback de plataforma"){
      const c=st.projetos.find(x=>x.id===st.formPlat);
      if (c){ projetoId=c.id; plataforma=c.titulo; } else plataforma=(f["r-plat"]||"").trim();
    }
    const btn=$("#r-send"); btn.disabled=true;
    const { data, error } = await sb.rpc("enviar_pedido", {p_tipo:st.tipo, p_setor:setor, p_nome:nome, p_plataforma:plataforma, p_projeto_id:projetoId, p_titulo:titulo, p_descricao:(f["r-desc"]||"").trim(), p_precisa_ate:f["r-date"]||null});
    btn.disabled=false;
    if (error){ toast(erroTxt(error)); return; }
    ["r-title","r-desc","r-plat","r-date","r-nome"].forEach(k=>{ const el=document.getElementById(k); if (el) el.value=""; });
    st.formPlat=""; toast(`pedido ${data.codigo} registrado`);
    await carregar();
  }
  async function delPedido(p){
    if (!(await ask({title:"excluir pedido?", body:`“${p.titulo}” (${p.codigo}) será apagado com a avaliação e as notas. isso não pode ser desfeito.`, ok:"excluir", danger:true}))) return;
    if (await ok(sb.from("pedidos").delete().eq("id", p.id))){ st.pedidos=st.pedidos.filter(r=>r.id!==p.id); st.selPed=null; render(); toast("pedido excluído"); }
  }
  async function delProjeto(p){
    if (!(await ask({title:"excluir projeto?", body:`“${p.titulo||"este projeto"}” será apagado com etapas, pendências e arquivos anexados. pedidos vinculados continuam na caixa de pedidos.`, ok:"excluir", danger:true}))) return;
    const paths=(p.docs||[]).map(d=>d.path).filter(Boolean);
    if (await ok(sb.from("projetos").delete().eq("id", p.id))){
      if (paths.length) sb.storage.from("docs").remove(paths).catch(()=>{});
      st.projetos=st.projetos.filter(x=>x.id!==p.id); st.pedidos.forEach(r=>{ if (r.projeto_id===p.id) r.projeto_id=null; });
      st.selProj=null; mem.set("cp-proj",""); go("projetos"); toast("projeto excluído");
    }
  }
  async function addCk(){
    const p=curP(st.selProj), i=$("#new-item"); if (!p||!i) return; const v=i.value.trim(); if (!v) return; i.value="";
    await updP(p,{checklist:[...(p.checklist||[]),{id:uid(),texto:v,feito:false}]}); render(); $("#new-item")?.focus();
  }
  async function addLink(){
    const p=curP(st.selProj); if (!p) return; const u=urlOk($("#lk-u")?.value);
    if (!u){ toast("informe um endereço válido, começando por http ou https."); $("#lk-u")?.focus(); return; }
    const tt=$("#lk-t").value.trim(); $("#lk-t").value=""; $("#lk-u").value="";
    await updP(p,{links:[...(p.links||[]),{id:uid(), titulo:tt, url:u, em:Date.now()}]}); render(); toast("link adicionado");
  }
  async function uploadDocs(){
    const p=curP(st.selProj); if (!p) return;
    const files=[...($("#doc-file")?.files||[])]; if (!files.length){ toast("escolha um ou mais arquivos."); return; }
    const novos=[]; const btn=$('[data-act="doc-up"]'); if (btn){ btn.disabled=true; btn.textContent="enviando…"; }
    for (const f of files){
      if (f.size>50*1048576){ toast(`“${f.name}” passa de 50 mb.`); continue; }
      const safe=f.name.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^\w.-]+/g,"_").slice(-80);
      const path=`${p.id}/${uid()}-${safe}`;
      const { error } = await sb.storage.from("docs").upload(path, f, {contentType:f.type||undefined});
      if (error){ console.warn(error); toast(`não foi possível enviar “${f.name}”.`); continue; }
      novos.push({id:uid(), path, nome:f.name, tamanho:f.size, tipo:f.type, em:Date.now()});
    }
    if (novos.length){ await updP(p,{docs:[...(p.docs||[]),...novos]}); toast(novos.length===1?"documento anexado":"documentos anexados"); }
    render();
  }
  async function abrirDoc(path){
    const w=window.open("", "_blank");
    const { data, error } = await sb.storage.from("docs").createSignedUrl(path, 600);
    if (error || !data?.signedUrl){ w?.close(); toast("não foi possível abrir o arquivo."); return; }
    if (w) w.location.href=data.signedUrl; else location.href=data.signedUrl;
  }
  function exportar(){
    const dados={app:"controle-de-projetos", versao:1, exportado_em:new Date().toISOString(), pedidos:st.pedidos, projetos:st.projetos, config:st.configRows};
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([JSON.stringify(dados,null,2)],{type:"application/json"}));
    a.download=`controle-projetos-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast("backup baixado. guarde o arquivo no OneDrive.");
  }
  async function importar(file){
    let d; try{ d=JSON.parse(await file.text()); }catch{ toast("o arquivo não é um backup válido."); return; }
    if (d?.app!=="controle-de-projetos" || !Array.isArray(d.pedidos) || !Array.isArray(d.projetos)){ toast("o arquivo não é um backup desta plataforma."); return; }
    if (!(await ask({title:"restaurar backup?", body:`o arquivo tem ${plural(d.projetos.length,"projeto")} e ${plural(d.pedidos.length,"pedido")} (de ${dataBr(Date.parse(d.exportado_em))}). itens com o mesmo identificador serão substituídos pela versão do arquivo. itens que só existem hoje continuam.`, ok:"restaurar"}))) return;
    const lotes = (arr,n=200) => Array.from({length:Math.ceil(arr.length/n)},(_,i)=>arr.slice(i*n,(i+1)*n));
    try{
      for (const l of lotes(d.projetos)) await run(sb.from("projetos").upsert(l));
      for (const l of lotes(d.pedidos)) await run(sb.from("pedidos").upsert(l));
      if (Array.isArray(d.config) && d.config.length) await run(sb.from("config").upsert(d.config));
      await sb.rpc("ajustar_protocolo");
      toast("backup restaurado"); await carregar();
    }catch{}
  }

  document.addEventListener("submit", e => { if (e.target.id==="pform"){ e.preventDefault(); registrar(); } });
  document.addEventListener("click", async e => {
    const b=e.target.closest("[data-act]"); if (!b || b.closest("#modal") || !st.user) return;
    const act=b.dataset.act, id=b.dataset.id, P=()=>curP(st.selProj), ped=()=>allPedidos().find(x=>x.id===id);
    if (b.tagName==="A" && act) e.preventDefault();
    switch(act){
      case "nav": go(b.dataset.v); break;
      case "new-proj": novoProjeto(); break;
      case "open-proj": go("projeto",{selProj:id, projTab:st.selProj===id?st.projTab:"geral", selTopic:st.selProj===id?st.selTopic:null}); break;
      case "open-ped": { const p=ped(); st.grupo = !p?"todos": p.status==="recebido"?"triar": ["entregue","recusado"].includes(p.status)?"enc":"fila"; st.busca=""; st.fTipo=""; st.fSetor=""; go("pedidos",{selPed:id}); break; }
      case "go-ped": go("pedidos",{grupo:b.dataset.g, selPed:null}); break;
      case "ver-novos": go("pedidos",{grupo:"todos", selPed:null, busca:"", fTipo:"", fSetor:""}); break;
      case "visto": st.visto=Date.now(); await salvarConfig("visto",{em:st.visto}); render(); break;
      case "sel-ped": st.selPed=id; st.recusando=null; render(); if (matchMedia("(max-width:900px)").matches) window.scrollTo({top:0}); else { const d=$("#det"); if (d) d.scrollTop=0; } break;
      case "desel-ped": st.selPed=null; render(); break;
      case "grupo": st.grupo=b.dataset.g; st.selPed=null; render(); break;
      case "pesos": st.pesosOpen=!st.pesosOpen; render(); break;
      case "set-st": if (ped()){ await setStatus(id, b.dataset.s); toast(`pedido: ${b.dataset.s}`); render(); } break;
      case "recusar": st.recusando=id; render(); setTimeout(()=>$("#d-recmsg")?.focus(),30); break;
      case "recusar-x": st.recusando=null; render(); break;
      case "recusar-ok": { const msg=($("#d-recmsg")?.value||"").trim(); st.recusando=null; await setStatus(id,"recusado",{msg}); toast("pedido recusado"); render(); break; }
      case "virar-proj": { const p=ped(); if (p) virarProjeto(p); break; }
      case "link": if (await patchPed(id,{projeto_id:b.dataset.pid})){ toast("pedido vinculado ao projeto"); render(); } break;
      case "link-sel": { const v=$("#d-vsel")?.value; if (!v){ toast("escolha o projeto."); break; } if (await patchPed(id,{projeto_id:v})){ toast("pedido vinculado ao projeto"); render(); } break; }
      case "unlink": if (await patchPed(id,{projeto_id:null})){ toast("vínculo removido"); render(); } break;
      case "del-ped": { const p=ped(); if (p) delPedido(p); break; }
      case "ai-sug": { const p=ped(); if (p) aiSugerir(p); break; }
      case "ai-dup": { const p=ped(); if (p) aiParecidos(p); break; }
      case "ai-x": if (st.ai[id]) delete st.ai[id][b.dataset.k]; render(); break;
      case "ai-sug-ok": { const s=st.ai[id]?.sug; if (s){ await patchPed(id,{esforco:s.esforco,impacto:s.impacto}); delete st.ai[id].sug; render(); } break; }
      case "sum": aiResumo(); break;
      case "sum-x": st.sum?.ctl?.abort(); st.sum=null; render(); break;
      case "pmodo": st.projModo=b.dataset.m; mem.set("cp-pmodo",st.projModo); render(); break;
      case "ptab": st.projTab=b.dataset.t; render(); break;
      case "cal": { const i=$("#f-prazo"); try{ i.showPicker(); }catch{ i.focus(); i.click(); } break; }
      case "del-proj": { const p=P(); if (p) delProjeto(p); break; }
      case "topic": st.projTab="definicoes"; st.selTopic=b.dataset.k; render(); setTimeout(()=>{ $("#editor")?.scrollIntoView({block:"nearest", behavior:"smooth"}); },20); break;
      case "topic-x": st.selTopic=null; render(); break;
      case "tst": { const p=P(); if (p){ const tx=$("#tx-"+b.dataset.k); const patch={st:b.dataset.s}; if (tx) patch.txt=tx.value; await updTopic(p.id,b.dataset.k,patch); render(); } break; }
      case "topic-done": { const p=P(); if (!p) break; const k=b.dataset.k, tx=$("#tx-"+k); await updTopic(p.id,k,{st:"pronto", ...(tx?{txt:tx.value}:{})});
        const nxt = TOPICOS.slice(TOPICOS.findIndex(t=>t.k===k)+1).find(t=>stT(p,t.k)!=="pronto") || TOPICOS.find(t=>stT(p,t.k)!=="pronto");
        st.selTopic = nxt?nxt.k:null; render(); toast(nxt?`pronto. próximo: ${nxt.t}`:"todos os tópicos estão prontos"); break; }
      case "ai-top": { const p=P(); if (p) aiTopico(p.id,b.dataset.k); break; }
      case "ck-add": addCk(); break;
      case "ck-del": { const p=P(); if (p){ await updP(p,{checklist:(p.checklist||[]).filter(i=>i.id!==id)}); render(); } break; }
      case "ai-check": { const p=P(); if (p) aiChecklist(p); break; }
      case "ai-analyze": { const p=P(); if (p) aiAnalyze(p); break; }
      case "aip-x": { const p=P(); if (p){ st.aiProj[p.id]?.ctl?.abort(); delete st.aiProj[p.id]; render(); } break; }
      case "ai-add-all": { const p=P(), s=p&&st.aiProj[p.id]; if (s?.items?.length){ await updP(p,{checklist:[...(p.checklist||[]),...s.items.map(t=>({id:uid(),texto:t,feito:false}))]}); delete st.aiProj[p.id]; toast("pendências adicionadas"); render(); } break; }
      case "ai-add": { const p=P(), s=p&&st.aiProj[p.id]; if (!s) break; const k=+b.dataset.k, t=s.items[k]; s.items=s.items.filter((_,j)=>j!==k); if (!s.items.length) delete st.aiProj[p.id]; await updP(p,{checklist:[...(p.checklist||[]),{id:uid(),texto:t,feito:false}]}); render(); break; }
      case "dkind": st.docKind=b.dataset.k; render(); break;
      case "lk-add": addLink(); break;
      case "lk-del": { const p=P(); if (p){ await updP(p,{links:(p.links||[]).filter(l=>l.id!==id)}); render(); } break; }
      case "doc-open": abrirDoc(b.dataset.path); break;
      case "doc-del": { const p=P(), d=p&&(p.docs||[]).find(x=>x.id===id); if (!d) break; if (!(await ask({title:"remover documento?", body:`“${d.nome}” será apagado.`, ok:"remover", danger:true}))) break; await updP(p,{docs:(p.docs||[]).filter(x=>x.id!==id)}); if (d.path) sb.storage.from("docs").remove([d.path]).catch(()=>{}); render(); break; }
      case "doc-up": uploadDocs(); break;
      case "tipo": st.tipo=b.dataset.v; render(); break;
      case "copiar-form": toast(await copiar(urlFormulario()) ? "link copiado" : "não foi possível copiar. selecione o link e copie."); break;
      case "ia-salvar": { const v=($("#ia-key")?.value||"").trim(); if (v && !/^sk-ant-/.test(v)){ toast("a chave da API começa com sk-ant-."); break; } mem.set("cp-ia-key", v); render(); toast(v?"chave salva neste navegador":"chave removida"); break; }
      case "ia-remover": mem.set("cp-ia-key",""); render(); toast("chave removida"); break;
      case "exportar": exportar(); break;
      case "sair": await sb.auth.signOut(); location.reload(); break;
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key==="Enter" && e.target.id==="new-item"){ e.preventDefault(); addCk(); }
    if (e.key==="Enter" && e.target.id==="lk-u"){ e.preventDefault(); addLink(); }
    if (e.key==="Enter" && (e.target.id==="f-titulo" || e.target.dataset?.cktxt)) e.target.blur();
    if ((e.key==="Enter"||e.key===" ") && e.target.matches?.("tr[data-act]")){ e.preventDefault(); e.target.click(); }
  });
  document.addEventListener("input", e => {
    const t=e.target;
    if (t.id==="f-busca"){ st.busca=t.value; st.selPed=null; render(); }
    if (t.id==="p-busca"){ st.projBusca=t.value; render(); }
  });
  document.addEventListener("change", async e => {
    const t=e.target, id=st.selPed, p=curP(st.selProj);
    if (!st.user) return;
    switch(t.id){
      case "f-tipo": st.fTipo=t.value; st.selPed=null; render(); return;
      case "f-setor": st.fSetor=t.value; st.selPed=null; render(); return;
      case "d-status": await setStatus(id, t.value); render(); return;
      case "d-dir": await patchPed(id,{diretoria:t.checked}); render(); return;
      case "d-esf": await patchPed(id,{esforco:t.value?+t.value:null}); render(); return;
      case "d-imp": await patchPed(id,{impacto:t.value?+t.value:null}); render(); return;
      case "d-prazo": patchPed(id,{prazo:t.value||null}); return;
      case "d-notas": patchPed(id,{notas:t.value}); return;
      case "d-msg": { const v=t.value.trim(); if (v!==(rowPed(id)?.msg||"")){ if (await patchPed(id,{msg:v})) toast("mensagem salva. o solicitante já pode ver."); } return; }
      case "r-proj": st.formPlat=t.value; render(); return;
      case "imp-file": if (t.files?.[0]) importar(t.files[0]); t.value=""; return;
      case "f-status": if (p) mudarStatusProjeto(p, t.value, t); return;
      case "f-pub": if (p) updP(p,{publico:t.checked}); return;
      case "f-plink": { if (!p) return; const v=t.value.trim(); if (!v){ await updP(p,{plataforma_url:""}); render(); return; }
        const u=urlOk(v); if (!u){ toast("informe um endereço válido, começando por http ou https."); t.value=p.plataforma_url||""; return; }
        await updP(p,{plataforma_url:u}); render(); return; }
    }
    if (t.dataset.peso){ const v=Math.max(0,Math.min(100,Math.round(+t.value||0))); st.pesos={...st.pesos,[t.dataset.peso]:v}; t.value=v; salvarConfig("pesos", st.pesos); render(); return; }
    if (!p) return;
    if (["f-titulo","f-objetivo","f-responsavel","f-notas","f-prazo"].includes(t.id)){ const key=t.id.slice(2); if (t.value!==(p[key]||"")){ await updP(p,{[key]:t.value}); if (key==="titulo"||key==="prazo") render(); } return; }
    if (t.dataset.tx){ updTopic(p.id, t.dataset.tx, {txt:t.value}); return; }
    if (t.dataset.ck){ await updP(p,{checklist:(p.checklist||[]).map(i=>i.id===t.dataset.ck?{...i,feito:t.checked}:i)}); render(); return; }
    if (t.dataset.cktxt){ const v=t.value.trim(), list=p.checklist||[]; await updP(p,{checklist: v ? list.map(i=>i.id===t.dataset.cktxt?{...i,texto:v}:i) : list.filter(i=>i.id!==t.dataset.cktxt)}); return; }
  });

  /* ---------- ia ---------- */
  const pedTxt = p => `protocolo: ${p.codigo}\ntipo: ${p.tipo}\nsetor: ${p.setor}, solicitante: ${p.nome}\nplataforma: ${p.plataforma||"(não informada)"}\ntítulo: ${p.titulo}\ndescrição: ${p.descricao||"(sem descrição)"}\nprecisa até: ${p.precisaAte||"(sem data)"}`;
  const projText = p => `título: ${p.titulo||"(sem título)"}\nstatus: ${pst(p)}\nresponsável: ${p.responsavel||"(não definido)"}\nprazo: ${p.prazo||"(sem prazo)"}\nobjetivo: ${p.objetivo||"(não escrito)"}\nobservações: ${p.notas||"(nenhuma)"}\nchecklist:\n${(p.checklist||[]).map(i=>`- [${i.feito?"x":" "}] ${i.texto}`).join("\n")||"(vazio)"}`;
  const defsTxt = (p, n=1500) => ETAPAS.map(e=>`${e.t}\n`+e.topicos.map(t=>`- ${t.t} [${stT(p,t.k)}]\n  roteiro: ${t.itens.join("; ")}\n  resposta: ${(p.etapas?.[t.k]?.txt||"").trim().slice(0,n)||"(vazio)"}`).join("\n")).join("\n\n");

  async function aiSugerir(p){
    const a=(st.ai[p.id] ||= {}); a.sug={busy:true}; render();
    try{
      const r = await IA.json(`Você ajuda a priorizar pedidos que setores de uma construtora fazem a quem desenvolve as plataformas internas da empresa. Avalie o pedido abaixo.\n\nEsforço de desenvolvimento, de 1 a 5: 1 = horas, 2 = poucos dias, 3 = algumas semanas, 4 = cerca de um mês, 5 = vários meses.\nImpacto, de 1 a 5: 1 = uma pessoa, 2 = parte de um setor, 3 = um setor inteiro, 4 = vários setores, 5 = a construtora toda.\n\n${pedTxt(p)}\n\nResponda somente com JSON: {"esforco": número, "impacto": número, "motivo": "duas frases curtas em português do Brasil, sem markdown"}`);
      if (r===null){ delete a.sug; }
      else {
        const e=Math.round(+r.esforco), i=Math.round(+r.impacto);
        if (!(e>=1&&e<=5&&i>=1&&i<=5)) throw {code:"bad"};
        a.sug={esforco:e, impacto:i, motivo:String(r.motivo||"").slice(0,400)};
      }
    }catch(e){ a.sug={err:IA.erro(e)}; }
    schedule();
  }
  async function aiParecidos(p){
    const outros = allPedidos().filter(x=>x.id!==p.id).sort((x,y)=>y.criadoEm-x.criadoEm).slice(0,80);
    const a=(st.ai[p.id] ||= {});
    if (!outros.length){ a.dup={items:[]}; render(); return; }
    a.dup={busy:true}; render();
    try{
      const r = await IA.json(`Compare o pedido-alvo com a lista de outros pedidos e indique apenas os que pedem praticamente a mesma coisa ou claramente se sobrepõem (no máximo 5). Não force correspondências.\n\npedido-alvo:\n${pedTxt(p)}\n\noutros pedidos:\n${outros.map(x=>`- id ${x.id} | ${x.codigo} | ${x.status} | ${x.titulo}: ${(x.descricao||"").slice(0,220)}`).join("\n")}\n\nResponda somente com JSON: {"parecidos":[{"id":"id exato da lista","motivo":"frase curta em português do Brasil"}]}. Se não houver nenhum, {"parecidos":[]}.`);
      if (r===null) delete a.dup;
      else {
        const map=Object.fromEntries(outros.map(x=>[x.id,x]));
        a.dup={items:(Array.isArray(r?.parecidos)?r.parecidos:[]).filter(x=>map[x.id]).slice(0,5).map(x=>({id:x.id, titulo:map[x.id].titulo, status:map[x.id].status, motivo:String(x.motivo||"").slice(0,200)}))};
      }
    }catch(e){ a.dup={err:IA.erro(e)}; }
    schedule();
  }
  async function aiResumo(){
    const todos=allPedidos(), now=Date.now();
    const lin = p => `- [${p.codigo} | ${p.tipo} | ${p.setor} | ${p.status} | nota ${score(p).n}${p.g.diretoria?" | diretoria":""}] ${p.titulo}`;
    const novos=todos.filter(p=>now-p.criadoEm<7*DAY), triar=todos.filter(p=>p.status==="recebido"), parados=todos.filter(p=>["em análise","aprovado"].includes(p.status)&&now-p.statusEm>10*DAY);
    const top=todos.filter(p=>["em análise","aprovado","em desenvolvimento"].includes(p.status)).sort((a,b)=>score(b).n-score(a).n).slice(0,6);
    const atras=st.projetos.filter(p=>prazoP(p).late).map(p=>`- ${p.titulo} (${prazoP(p).t})`);
    const prompt=`Você é o assistente de quem gerencia a fila de pedidos de plataformas internas de uma construtora. Escreva em português do Brasil, em texto simples sem markdown, curto e direto:\n1) o que chegou nos últimos 7 dias e se há temas ou setores que se repetem;\n2) o que triar primeiro e por quê;\n3) o que pode estar parado ou atrasado;\n4) uma recomendação de foco para a semana.\n\nchegaram nos últimos 7 dias (${novos.length}):\n${novos.slice(0,40).map(lin).join("\n")||"(nenhum)"}\n\npara triar (${triar.length}):\n${triar.slice(0,40).map(p=>lin(p)+` (${idade(p.criadoEm)})`).join("\n")||"(nenhum)"}\n\nmaiores notas na fila:\n${top.map(lin).join("\n")||"(vazia)"}\n\nsem movimento há mais de 10 dias (${parados.length}):\n${parados.slice(0,20).map(lin).join("\n")||"(nenhum)"}\n\nprojetos atrasados (${atras.length}):\n${atras.slice(0,20).join("\n")||"(nenhum)"}`;
    const ctl=new AbortController(); st.sum={busy:true, text:"", ctl}; if (IA.integrada()) render();
    try{
      const r = await IA.rodar(prompt, {signal:ctl.signal, onText:text=>{ if (st.sum?.ctl===ctl){ st.sum.text=text; const o=$("#sum-out"); if (o){ o.textContent=text; o.classList.remove("thinking"); } } }});
      if (st.sum?.ctl===ctl) st.sum = r===null ? null : {text:r};
    }catch(e){ if (ctl.signal.aborted) return; if (st.sum?.ctl===ctl) st.sum={text:IA.erro(e)}; }
    schedule();
  }
  async function aiTopico(pid,k){
    const p=curP(pid); if (!p) return; const e=etapaDe(k), t=TOP[k], key=pid+":"+k;
    const tx=$("#tx-"+k), atual = tx ? tx.value : (p.etapas?.[k]?.txt||"");
    const outros = TOPICOS.filter(x=>x.k!==k && p.etapas?.[x.k]?.txt?.trim()).map(x=>`${x.t}:\n${p.etapas[x.k].txt.trim().slice(0,500)}`).join("\n\n").slice(0,3500);
    const prompt=`Você ajuda a estruturar projetos de plataformas internas de uma construtora. Escreva um rascunho curto do tópico “${t.t}” (etapa “${e.t}”) para o projeto abaixo. Cubra, em uma ou duas linhas cada, todos os itens do roteiro: ${t.itens.join("; ")}. Onde faltar informação, escreva “a definir:” e diga o que precisa ser decidido ou perguntado. Português do Brasil, texto simples sem markdown, cada linha começando pelo nome do item.\n\n${projText(p)}${atual.trim()?`\n\nO que já está escrito neste tópico:\n${atual.trim()}`:""}${outros?`\n\nO que já foi escrito em outros tópicos:\n${outros}`:""}`;
    if (!IA.integrada()){ await IA.rodar(prompt); return; }
    if (tx && tx.value!==(p.etapas?.[k]?.txt||"")) await updTopic(pid,k,{txt:tx.value});
    st.aiTop[key]=true; render();
    try{
      const r = await IA.rodar(prompt);
      const cur=curP(pid), antigo=(cur.etapas?.[k]?.txt||"").trim(), novo=(antigo?antigo+"\n\n":"")+r;
      await updTopic(pid,k,{txt:novo.slice(0,4000), st: stT(cur,k)==="pendente"?"em andamento":stT(cur,k)}); toast("rascunho da ia adicionado. revise antes de marcar pronto.");
    }catch(err){ toast(IA.erro(err)); }
    delete st.aiTop[key]; schedule();
  }
  async function aiChecklist(p){
    if (!p.objetivo?.trim() && !p.titulo?.trim()){ toast("escreva o objetivo primeiro."); return; }
    const prompt=`Você ajuda a planejar projetos. Com base no projeto abaixo, sugira de 5 a 8 pendências NOVAS (que não repitam as já listadas), curtas, concretas e acionáveis, em português do Brasil, na ordem em que devem ser feitas.\n\n${projText(p)}\n\nResponda somente com JSON no formato {"itens":["...","..."]}.`;
    if (!IA.integrada()){ await IA.rodar(prompt); return; }
    st.aiProj[p.id]={kind:"check",busy:true}; render();
    try{
      const r=await IA.json(prompt);
      const items=(Array.isArray(r?.itens)?r.itens:[]).filter(x=>typeof x==="string"&&x.trim()).map(x=>x.trim().slice(0,200)).slice(0,10);
      st.aiProj[p.id]={kind:"check",items,error:items.length?null:"a ia não trouxe sugestões. detalhe mais o objetivo e tente de novo."};
    }catch(e){ st.aiProj[p.id]={kind:"check",items:[],error:IA.erro(e)}; }
    schedule();
  }
  async function aiAnalyze(p){
    const prompt=`Você é um gerente de projetos experiente revisando a definição de uma plataforma interna de uma construtora. O projeto segue 4 etapas com ${NT} tópicos; cada tópico tem um roteiro de itens que precisam ser respondidos. Leia tudo e escreva, em português do Brasil, em texto simples sem markdown (sem asteriscos ou #):\n\n1) Situação em duas frases.\n2) O que falta: para cada tópico que não está pronto ou cuja resposta não cobre o roteiro, diga quais itens do roteiro ainda não foram respondidos ou estão vagos. Agrupe por etapa e seja específico.\n3) Inconsistências entre tópicos, se houver (por exemplo, escopo que não bate com o cronograma).\n4) Riscos principais (até 3).\n5) Próximos 3 passos, em ordem.\n\n${projText(p)}\n\ndefinições por etapa:\n${defsTxt(p)}`;
    if (!IA.integrada()){ await IA.rodar(prompt); return; }
    const ctl=new AbortController(); st.aiProj[p.id]={kind:"analyze",busy:true,text:"",ctl}; render();
    try{
      const r=await IA.rodar(prompt, {signal:ctl.signal, onText:text=>{ const s=st.aiProj[p.id]; if (s?.ctl===ctl){ s.text=text; const o=$("#an-out"); if (o){ o.textContent=text; o.classList.remove("thinking"); } } }});
      if (st.aiProj[p.id]?.ctl===ctl) st.aiProj[p.id]={kind:"analyze",text:r};
    }catch(e){ if (ctl.signal.aborted) return; st.aiProj[p.id]={kind:"analyze",text:IA.erro(e)}; }
    schedule();
  }

  /* ---------- login e início ---------- */
  function telaLogin(msg=""){
    $("#app").hidden=true; const l=$("#login"); l.hidden=false;
    l.innerHTML = `<div class="login"><div class="login-card">
      <div class="logo"><img src="assets/logo.png" alt="Diálogo Engenharia"></div>
      <h1>controle de projetos</h1>
      ${!configurado ? `<div class="notice">falta configurar o Supabase. preencha a Project URL em <b>assets/config.js</b> e publique de novo.</div>`
        : `<p class="hint">entre com seu e-mail. você recebe um link de acesso, sem senha.</p>
      ${msg?`<div class="notice">${esc(msg)}</div>`:""}
      <form id="lform" class="form" style="gap:12px"><label class="f">e-mail<input type="email" id="l-email" value="${esc(CFG.GESTOR_EMAIL||"")}" autocomplete="email" required></label>
        <button class="btn primary" id="l-btn">enviar link de acesso</button></form>`}
      <p class="hint">quer só enviar um pedido? <a href="pedido.html">abra o formulário</a>.</p>
    </div></div>`;
    $("#lform")?.addEventListener("submit", async e => {
      e.preventDefault(); const email=$("#l-email").value.trim(), btn=$("#l-btn"); if (!email) return;
      btn.disabled=true; btn.textContent="enviando…";
      const { error } = await sb.auth.signInWithOtp({ email, options:{ shouldCreateUser:false, emailRedirectTo: location.href.replace(/[#?].*$/,"") } });
      if (error){ btn.disabled=false; btn.textContent="enviar link de acesso"; toast(/signups? not allowed|not found|user/i.test(error.message)?"este e-mail não tem acesso.":erroTxt(error)); return; }
      btn.textContent="link enviado"; toast(`link enviado para ${email}. abra o e-mail neste aparelho.`);
    });
  }
  let poll=null, entrando=false;
  async function entrar(session){
    if (entrando || st.user?.id===session.user.id) return;
    entrando=true;
    const { data:admin } = await sb.rpc("is_admin");
    entrando=false;
    if (!admin){ await sb.auth.signOut(); telaLogin(`${session.user.email} não tem acesso à gestão.`); return; }
    st.user=session.user;
    $("#login").hidden=true; $("#app").hidden=false;
    render(); await carregar();
    clearInterval(poll); poll=setInterval(()=>{ if (!document.hidden) carregar(); }, 60000);
    document.addEventListener("visibilitychange", ()=>{ if (!document.hidden) carregar(); });
  }
  (async () => {
    if (!sb){ telaLogin(); return; }
    sb.auth.onAuthStateChange((ev, session) => {
      if (session && (ev==="SIGNED_IN" || ev==="INITIAL_SESSION")) setTimeout(()=>entrar(session), 0);
    });
    const { data:{ session } } = await sb.auth.getSession();
    if (session) entrar(session); else telaLogin();
  })();
})();
