/* IA da gestão. Duas formas de uso:
   - sem chave: copia o prompt e abre o Claude para você colar (custo zero);
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

  // sem chave devolve null depois de copiar o prompt; com chave devolve o texto da resposta
  async function rodar(prompt, { onText, signal } = {}){
    if (!integrada()){
      const ok = await copiar(prompt);
      window.open("https://claude.ai/new", "_blank", "noopener");
      toast(ok ? "prompt copiado. cole no Claude que abriu em outra aba." : "não foi possível copiar o prompt.");
      return null;
    }
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
  async function json(prompt, opts){
    const t = await rodar(prompt, opts);
    if (t===null) return null;
    const i=t.indexOf("{"), j=t.lastIndexOf("}");
    try{ return JSON.parse(t.slice(i, j+1)); }catch{ throw { code:"bad" }; }
  }
  const erro = e => {
    if (e?.code==="bad") return "a ia não respondeu no formato esperado. tente de novo.";
    if (e?.code==="refusal") return "a ia não pôde responder este pedido.";
    if (e?.status===401) return "a chave da API não é válida. confira em configurar ia.";
    if (e?.status===429) return "limite de uso da API atingido. tente em instantes.";
    if (e?.status===402 || /credit/i.test(e?.message||"")) return "sem créditos na conta da API da Anthropic.";
    return "a ia não respondeu. tente de novo.";
  };
  return { chave, integrada, rodar, json, erro, MODELO };
})();
