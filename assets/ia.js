/* IA da gestão. Duas formas de uso:
   - sem chave: copia um prompt pronto com os dados da plataforma e abre o Claude (sua assinatura, custo zero);
     depois você cola a resposta de volta na plataforma;
   - com chave da API da Anthropic (fica só neste navegador): responde dentro do app. */
const IA = (() => {
  const SDK = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.128.0/+esm";
  const MODELO = "claude-opus-5-5";
  let client = null, clientKey = "";

  const chave = () => mem.get("cp-ia-key");
  const integrada = () => !!chave();

  async function cliente(){
    const k=chave();
    if (!client || clientKey!==k){
      const { default: Anthropic } = await import(SDK);
      client = new Anthropic({ apiKey:k, dangerouslyAllowBrowser:true });
      clientKey = k;
    }
    return client;
  }

  // copia o prompt e abre o Claude; prompts curtos já chegam preenchidos na conversa
  async function abrirNoClaude(prompt){
    const ok = await copiar(prompt);
    const q = encodeURIComponent(prompt);
    window.open(q.length < 6000 ? `https://claude.ai/new?q=${q}` : "https://claude.ai/new", "_blank", "noopener");
    toast(ok ? "prompt copiado e Claude aberto. se a conversa abrir vazia, cole com Ctrl+V. depois traga a resposta para cá."
             : "não foi possível copiar o prompt. use o botão copiar prompt na caixa que apareceu.");
    return ok;
  }

  // com chave devolve o texto da resposta; sem chave abre o Claude e devolve null
  async function rodar(prompt, { onText, signal } = {}){
    if (!integrada()){ await abrirNoClaude(prompt); return null; }
    const c = await cliente();
    try{
      const stream = c.beta.messages.stream({
        model: MODELO,
        max_tokens: 16000,
        output_config: { effort: "medium" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        messages: [{ role:"user", content: prompt }]
      }, { signal });
      if (onText) stream.on("text", (_delta, snapshot) => onText(snapshot));
      const msg = await stream.finalMessage();
      if (msg.stop_reason === "refusal") throw { code:"refusal" };
      return msg.content.filter(b=>b.type==="text").map(b=>b.text).join("").trim();
    }catch(e){
      if (signal?.aborted) throw { code:"aborted" };
      throw e;
    }
  }

  // aceita JSON puro, dentro de bloco ```json ou no meio de um texto
  function lerJson(t){
    const s = String(t||"");
    const bloco = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const base = bloco ? bloco[1] : s;
    const i=base.indexOf("{"), j=base.lastIndexOf("}");
    if (i<0 || j<i) throw { code:"bad" };
    try{ return JSON.parse(base.slice(i, j+1)); }catch{ throw { code:"bad" }; }
  }
  async function json(prompt, opts){
    const t = await rodar(prompt, opts);
    return t===null ? null : lerJson(t);
  }
  // texto colado do chat: tira marcações simples de markdown
  const limpar = t => String(t||"").replace(/\r/g,"").replace(/^#{1,6}\s+/gm,"").replace(/\*\*(.+?)\*\*/g,"$1").replace(/^\s*[-*]\s+/gm,"- ").trim();

  const erro = e => {
    if (e?.code==="bad") return "não encontrei a resposta no formato esperado. copie a resposta inteira do Claude e cole de novo.";
    if (e?.code==="refusal") return "a ia não pôde responder este pedido.";
    if (e?.status===401) return "a chave da API não é válida. confira em ajustes.";
    if (e?.status===429) return "limite de uso da API atingido. tente em instantes.";
    if (e?.status===402 || /credit/i.test(e?.message||"")) return "sem créditos na conta da API da Anthropic.";
    return "a ia não respondeu. tente de novo.";
  };
  return { chave, integrada, rodar, json, lerJson, limpar, abrirNoClaude, erro, MODELO };
})();
