/* Formulário público: envia pedidos sem login e acompanha os pedidos deste navegador. */
(() => {
  const st = { tipo:"novo projeto", catalogo:[], plat:"", meus:[], enviado:null, enviando:false };

  // pedidos deste navegador: [{token, codigo}]
  const lerTokens = () => { try{ const a=JSON.parse(mem.get("cp-tokens","[]")); return Array.isArray(a)?a:[]; }catch{ return []; } };
  const guardarToken = (token, codigo) => { const a=lerTokens().filter(x=>x.token!==token); a.unshift({token, codigo}); mem.set("cp-tokens", JSON.stringify(a.slice(0,50))); };
  const linkDe = token => `${urlFormulario()}?t=${token}`;

  function render(){
    const fb=st.tipo==="feedback de plataforma", hasCat=st.catalogo.length>0, outra=!hasCat||st.plat==="_outra";
    const f=formVals();
    $("#view").innerHTML = `
      <header class="vh"><div><p class="eyebrow">plataformas internas</p><h1>enviar um pedido</h1><p class="sub">peça uma plataforma nova ou envie um feedback sobre uma que você já usa. você recebe um protocolo para acompanhar o andamento.</p></div></header>
      ${!configurado?`<div class="notice">o formulário ainda não foi configurado. avise o responsável pela plataforma.</div>`:""}
      <div class="egrid">
        ${st.enviado ? okHtml() : `<form class="card form" id="pform" novalidate>
          <div class="seg" role="group" aria-label="tipo de pedido">${TIPOS.map(t=>`<button type="button" data-act="tipo" data-v="${t}" aria-pressed="${t===st.tipo}">${t}</button>`).join("")}</div>
          <div class="g2">
            <label class="f">setor<select id="r-setor"><option value="">escolha</option>${SETORES.map(s=>`<option ${s===mem.get("cp-setor")?"selected":""}>${s}</option>`).join("")}</select></label>
            <label class="f">seu nome<input id="r-nome" maxlength="60" value="${esc(mem.get("cp-nome"))}" autocomplete="name"></label>
          </div>
          ${fb&&hasCat?`<label class="f">sobre qual plataforma?<select id="r-proj"><option value="">escolha</option>${st.catalogo.map(c=>`<option value="${esc(c.id)}" ${st.plat===c.id?"selected":""}>${esc(c.titulo)}</option>`).join("")}<option value="_outra" ${st.plat==="_outra"?"selected":""}>outra, não está na lista</option></select></label>`:""}
          ${fb&&outra?`<label class="f">nome da plataforma<input id="r-plat" maxlength="80" placeholder="nome da plataforma sobre a qual é o feedback"></label>`:""}
          <label class="f">título<input id="r-title" maxlength="140" placeholder="resuma em uma linha"></label>
          <label class="f">descrição<textarea id="r-desc" maxlength="1500" placeholder="${fb?"o que funciona mal ou falta, onde acontece e como afeta seu trabalho":"o que precisa, por que e como isso é feito hoje"}"></textarea></label>
          <label class="f">precisa até (opcional)<input type="date" id="r-date"></label>
          <label class="hp" aria-hidden="true">não preencha<input id="r-site" tabindex="-1" autocomplete="off"></label>
          <div><button class="btn primary" type="submit" id="r-send" ${!configurado||st.enviando?"disabled":""}>${st.enviando?"enviando…":"enviar pedido"}</button></div>
        </form>`}
        <section class="card"><div class="card-h"><h2>meus pedidos</h2><span class="hint">${st.meus.length?plural(st.meus.length,"pedido"):""}</span></div>
          ${st.meus.length ? `<ul class="mlist">${st.meus.map(it=>`<li class="mit">
              <div><div class="tt">${esc(it.titulo)}</div><div class="dd"><span class="codigo">${esc(it.codigo)}</span><span class="chip">${esc(it.tipo)}</span><span>${esc(it.setor)}</span>${it.plataforma?`<span>${esc(it.plataforma)}</span>`:""}<span>enviado em ${dataBr(Date.parse(it.criado_em))}</span></div></div>
              ${trackHtml(it.status, it.hist)}
              ${it.msg?`<div class="msg"><b>resposta</b>${esc(it.msg)}</div>`:""}
              <div><button class="lnk" data-act="copiar" data-t="${esc(it.token)}">copiar link de acompanhamento</button></div></li>`).join("")}</ul>`
            : `<div class="empty">os pedidos enviados deste navegador aparecem aqui. se você enviou de outro aparelho, abra o link de acompanhamento que recebeu.</div>`}
        </section>
      </div>`;
    restore(f);
  }
  function okHtml(){
    const e=st.enviado;
    return `<section class="card form"><div class="ok-box"><span>pedido enviado. seu protocolo:</span><span class="code">${esc(e.codigo)}</span>
        <span class="hint">guarde o link abaixo para acompanhar o pedido de qualquer aparelho.</span>
        <div class="copyrow"><input readonly id="ok-link" value="${esc(linkDe(e.token))}" aria-label="link de acompanhamento"><button class="btn sm" data-act="copiar" data-t="${esc(e.token)}">copiar</button></div></div>
      <div><button class="btn" data-act="novo">enviar outro pedido</button></div></section>`;
  }
  const IDS=["r-setor","r-nome","r-title","r-desc","r-date","r-plat","r-proj"];
  const formVals = () => Object.fromEntries(IDS.map(id=>[id, document.getElementById(id)?.value]).filter(([,v])=>v!==undefined));
  const restore = f => Object.entries(f).forEach(([id,v])=>{ const el=document.getElementById(id); if (el && id!=="r-proj") el.value=v; });

  async function enviar(){
    const f=formVals(), setor=f["r-setor"], nome=(f["r-nome"]||"").trim(), titulo=(f["r-title"]||"").trim();
    if ($("#r-site")?.value) return; // robô
    if (!setor){ toast("escolha o setor."); $("#r-setor").focus(); return; }
    if (!nome){ toast("informe seu nome."); $("#r-nome").focus(); return; }
    if (!titulo){ toast("dê um título ao pedido."); $("#r-title").focus(); return; }
    let plataforma="", projetoId=null;
    if (st.tipo==="feedback de plataforma"){
      const c=st.catalogo.find(x=>x.id===st.plat);
      if (c){ projetoId=c.id; plataforma=c.titulo; }
      else { if (st.catalogo.length && !st.plat){ toast("escolha a plataforma."); $("#r-proj").focus(); return; } plataforma=(f["r-plat"]||"").trim(); }
    }
    st.enviando=true; render();
    const {data, error} = await sb.rpc("enviar_pedido", {p_tipo:st.tipo, p_setor:setor, p_nome:nome, p_plataforma:plataforma, p_projeto_id:projetoId, p_titulo:titulo, p_descricao:(f["r-desc"]||"").trim(), p_precisa_ate:f["r-date"]||null});
    st.enviando=false;
    if (error){ render(); toast(erroTxt(error)); return; }
    mem.set("cp-setor",setor); mem.set("cp-nome",nome);
    guardarToken(data.token, data.codigo);
    IDS.forEach(id=>{ const el=document.getElementById(id); if (el) el.value=""; });
    st.enviado=data; st.plat=""; render(); toast("pedido enviado");
    atualizar();
  }
  async function atualizar(){
    const tokens=lerTokens().map(x=>x.token);
    if (!tokens.length || !sb) return;
    const {data, error} = await sb.rpc("acompanhar", {p_tokens:tokens});
    if (!error && Array.isArray(data)){ st.meus=data; if (!$("#pform") || !document.activeElement || !$("#pform").contains(document.activeElement)) render(); }
  }

  document.addEventListener("submit", e => { if (e.target.id==="pform"){ e.preventDefault(); enviar(); } });
  document.addEventListener("change", e => { if (e.target.id==="r-proj"){ st.plat=e.target.value; render(); } });
  document.addEventListener("click", async e => {
    const b=e.target.closest("[data-act]"); if (!b || b.closest("#modal")) return;
    if (b.dataset.act==="tipo"){ st.tipo=b.dataset.v; render(); }
    if (b.dataset.act==="novo"){ st.enviado=null; render(); }
    if (b.dataset.act==="copiar"){ toast(await copiar(linkDe(b.dataset.t)) ? "link copiado" : "não foi possível copiar. selecione o link e copie."); }
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) atualizar(); });

  (async () => {
    const t=new URLSearchParams(location.search).get("t");
    if (t && /^[0-9a-f-]{36}$/i.test(t)) guardarToken(t, "");
    render();
    if (!sb) return;
    const {data} = await sb.rpc("catalogo");
    st.catalogo = Array.isArray(data) ? data : [];
    render();
    atualizar();
  })();
})();
