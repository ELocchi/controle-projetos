/* Vocabulário, utilitários e conexão com o Supabase, usados pela gestão e pelo formulário público. */

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const low = s => String(s || "").toLowerCase();
const norm = s => low(s).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
const pct = (a,b) => b ? Math.round(a/b*100) : 0;
const DAY = 864e5;
const plural = (n,s,p) => `${n} ${n===1?s:(p||s+"s")}`;
const dataBr = ts => ts ? new Date(ts).toLocaleDateString("pt-BR") : "";
const dataIso = s => s ? new Date(s+"T12:00:00").toLocaleDateString("pt-BR") : "";
const mem = {
  get(k,d=""){ try{ const v=localStorage.getItem(k); return v===null?d:v; }catch{ return d; } },
  set(k,v){ try{ localStorage.setItem(k,v); }catch{} }
};

/* ---------- vocabulário ---------- */
const STATUS = ["recebido","em análise","aprovado","em desenvolvimento","entregue","recusado"];
const TRACK = ["recebido","em análise","aprovado","em desenvolvimento","entregue"];
const TIPOS = ["novo projeto","feedback de plataforma"];
const SETORES = ["planejamento","custos","suprimentos","engenharia / obra","comercial","financeiro","rh","jurídico","diretoria","outro"];
const SCOR = {"recebido":"var(--warn)","em análise":"var(--ink2)","aprovado":"var(--accent2)","em desenvolvimento":"var(--accent)","entregue":"var(--ok)","recusado":"var(--flag)"};
const pill = (t,c) => `<span class="pill" style="--c:${c}">${esc(t)}</span>`;

/* linha do tempo do pedido; hist = [{s, em}] */
function trackHtml(status, hist){
  if (status==="recusado") return `<span class="refused">recusado</span>`;
  const ci=TRACK.indexOf(status), h=Array.isArray(hist)?hist:[];
  const em = t => { const x=[...h].reverse().find(y=>y.s===t); return x?dataBr(x.em):""; };
  return `<ol class="track">${TRACK.map((t,k)=>`<li class="${k<=ci?"on":""} ${k<ci?"pass":""} ${k===ci?"cur":""}">${t}${k<=ci&&em(t)?`<small>${em(t)}</small>`:""}</li>`).join("")}</ol>`;
}

/* ---------- avisos ---------- */
function toast(m){ const t=$("#toast"); if (!t) return; t.textContent=m; t.classList.add("show"); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove("show"),3200); }
function ask({title, body="", ok="confirmar", danger=false, cancel="cancelar"}){
  return new Promise(res => {
    const m=$("#modal");
    m.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mdl-t"><div class="modal-in"><h2 id="mdl-t">${esc(title)}</h2>${body?`<p>${esc(body)}</p>`:""}<div class="acts"><button class="btn" data-r="0">${esc(cancel)}</button><button class="btn ${danger?"danger solid":"primary"}" data-r="1">${esc(ok)}</button></div></div></div>`;
    const done = v => { m.innerHTML=""; document.removeEventListener("keydown", key, true); res(v); };
    const key = e => { if (e.key==="Escape"){ e.preventDefault(); done(false); } };
    document.addEventListener("keydown", key, true);
    m.querySelector(".modal").addEventListener("click", e => { const b=e.target.closest("[data-r]"); if (b) done(b.dataset.r==="1"); else if (e.target.classList.contains("modal")) done(false); });
    m.querySelector('[data-r="1"]').focus();
  });
}
async function copiar(texto){
  try{ await navigator.clipboard.writeText(texto); return true; }
  catch{
    const t=document.createElement("textarea"); t.value=texto; t.style.position="fixed"; t.style.opacity="0"; document.body.appendChild(t); t.select();
    let ok=false; try{ ok=document.execCommand("copy"); }catch{} t.remove(); return ok;
  }
}

/* ---------- Supabase ---------- */
const CFG = window.CP_CONFIG || {};
const configurado = !!(CFG.SUPABASE_URL && !/SEU-PROJETO/.test(CFG.SUPABASE_URL) && CFG.SUPABASE_KEY && window.supabase);
const sb = configurado ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY) : null;
const erroTxt = e => {
  const m = String(e?.message || "");
  if (/failed to fetch|network/i.test(m)) return "sem conexão com o servidor. verifique a internet e tente de novo.";
  if (/permission|rls|policy|jwt/i.test(m)) return "sem permissão. entre de novo na gestão.";
  return m || "algo deu errado. tente de novo.";
};
const urlFormulario = () => new URL("pedido.html", location.href.replace(/[#?].*$/,"")).href;
