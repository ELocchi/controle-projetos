# Controle de Projetos · guia para o Claude

Plataforma da Diálogo Engenharia (construtora) para receber pedidos dos setores e acompanhar os projetos de plataformas internas. O gestor é Emanuel Locchi. Escreva sempre em português do Brasil, em texto direto.

- Site estático no GitHub Pages: `index.html` (gestão, com login) e `pedido.html` (formulário público, sem login).
- Banco no Supabase, projeto `zdonoqqtctpjidwlcqcp` (região São Paulo). Esquema completo em `supabase/schema.sql`.
- Para consultar os dados, use o conector MCP do Supabase.

## Tabelas

### `pedidos`
Pedidos enviados pelos setores ou registrados pelo gestor.

| campo | significado |
|---|---|
| `codigo` | protocolo público, `DLG-0001` |
| `token` | segredo do link de acompanhamento. **Nunca mostre nem copie.** |
| `tipo` | `novo projeto` ou `feedback de plataforma` |
| `setor`, `nome` | quem pediu |
| `plataforma`, `projeto_id` | plataforma citada e projeto vinculado |
| `titulo`, `descricao`, `precisa_ate` | o pedido |
| `status` | `recebido` → `em análise` → `aprovado` → `em desenvolvimento` → `entregue`, ou `recusado` |
| `hist` | `[{s: status, em: epoch ms}]` |
| `msg` | resposta que o solicitante vê |
| `diretoria`, `esforco` (1–5), `impacto` (1–5), `prazo`, `notas` | avaliação interna. O solicitante não vê. |

Nota de prioridade (0 a 100): `(pd·diretoria + pe·(5−esforço)/4 + pi·(impacto−1)/4) / (pd+pe+pi)`. Os pesos estão em `config` (chave `pesos`), com padrão 50/30/20. Esforço ou impacto sem avaliação contam como 3.

Escalas:
- **esforço:** 1 horas, 2 poucos dias, 3 algumas semanas, 4 cerca de um mês, 5 vários meses.
- **impacto:** 1 uma pessoa, 2 parte de um setor, 3 um setor inteiro, 4 vários setores, 5 a construtora toda.

### `projetos`
| campo | significado |
|---|---|
| `status` | `planejamento`, `em andamento`, `pausado`, `testes`, `concluído` |
| `prazo`, `responsavel`, `objetivo`, `notas` | dados gerais |
| `checklist` | `[{id, texto, feito}]` |
| `etapas` | `{chave_do_topico: {txt, st}}`, com `st` em `pendente`, `em andamento` ou `pronto` |
| `links`, `docs` | anexos. Os arquivos ficam no bucket privado `docs`. |
| `origem` | `{pedidoId, codigo, nome, setor}`, quando o projeto nasceu de um pedido |
| `publico` | se aparece na lista do formulário de feedback |

### `config`
Chaves `pesos` e `visto` (última visita do gestor ao painel).

## As 4 etapas e os 16 tópicos (chave → roteiro)

1. **direcionamento**
   - `problema`: objetivo; problema e situação atual; indicadores de sucesso (2 ou 3 números com meta)
   - `pessoas`: público; responsáveis (quem usa e quem decide)
   - `escopo`: escopo inicial; fora do escopo; processo piloto
   - `viab`: alternativas consideradas; investimento (desenvolvimento, custo mensal, retorno)
2. **funcionamento**
   - `processo`: fluxo do processo; regras; critérios de aceite
   - `telas`: telas; notificações; relatórios e indicadores; uso em campo (celular, internet ruim)
   - `acessos`: acessos; perfis e permissões; histórico e auditoria
   - `dados`: dados; dados pessoais (LGPD); migração de dados; integrações
3. **arquitetura**
   - `solucao`: tecnologias; serviços de nuvem; diagrama; ambientes
   - `seguranca`: segurança; autenticação; gestão de segredos
   - `operacao`: capacidade; custos de nuvem; monitoramento e alertas; logs
   - `continuidade`: backup e recuperação; metas de recuperação; responsável técnico; propriedade do código e dos dados; plano de desativação
4. **execução**
   - `planejamento`: entregas priorizadas; equipe; cronograma; riscos; gestão de mudanças
   - `qualidade`: testes; definição de pronto; piloto
   - `lancamento`: plano de lançamento e de volta atrás; comunicação; treinamento
   - `pos`: suporte; canal de feedback; revisão pós-lançamento

## Como responder pedidos comuns

- **"O que falta no projeto X?"** Leia `etapas` e compare cada `txt` com o roteiro do tópico. Liste por etapa os itens não respondidos ou vagos. Aponte inconsistências entre tópicos e sugira os próximos 3 passos.
- **"Resumo da semana"** Liste os pedidos dos últimos 7 dias, os que estão em `recebido` (para triar), os parados há mais de 10 dias em `em análise` ou `aprovado`, e os projetos com `prazo` vencido que ainda não estão em `concluído`.
- **"Avalie o pedido DLG-…"** Sugira esforço e impacto pelas escalas acima, com duas frases de justificativa.

## Regras ao alterar dados

- Por padrão, só leia. Altere dados apenas quando o gestor pedir, e mostre antes o que vai mudar.
- Ao mudar `status` de um pedido, acrescente `{s, em}` em `hist` e atualize `status_em`.
- Ao mudar um projeto, atualize `atualizado_em`.
- Nunca exponha `token` nem `notas` internas em textos que vão para solicitantes.
