# Controle de Projetos · Diálogo

Plataforma para receber pedidos dos setores e acompanhar os projetos de plataformas internas.

- **`index.html`**: gestão (painel, pedidos, projetos e ajustes). Só o gestor entra, com um link de acesso enviado por e-mail.
- **`pedido.html`**: formulário público. Não precisa de login. Quem envia recebe um protocolo (ex.: `DLG-0042`) e um link para acompanhar o pedido.

Tudo roda em planos gratuitos: o site no **GitHub Pages**, e banco, login e arquivos no **Supabase**.

## Estrutura

```
index.html            gestão
pedido.html           formulário público
assets/config.js      endereço e chave pública do Supabase
assets/comum.js       vocabulário e utilitários das duas páginas
assets/gestao.js      app de gestão
assets/pedido.js      formulário público
assets/ia.js          funções de IA (copiar para o Claude ou API)
assets/style.css      visual
supabase/schema.sql   tabelas, regras de acesso e funções do banco
backup-repo/          rotina de backup semanal (vai num repositório privado)
```

## Configuração (uma vez)

### 1. Supabase

1. Abra o projeto em [supabase.com](https://supabase.com). A região recomendada é South America (São Paulo).
2. **SQL Editor > New query**: cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. **Authentication > Users > Add user > Create new user**: use `emanuel.locchi@dialogo.com.br`, marque *Auto Confirm User* e defina uma senha qualquer. Ela não é usada, o acesso é pelo link.
4. **Authentication > Sign In / Providers**: desligue **Allow new users to sign up**.
5. **Authentication > URL Configuration**:
   - **Site URL**: o endereço do site, ex.: `https://SEU-USUARIO.github.io/controle-projetos/`
   - **Redirect URLs**: adicione o mesmo endereço seguido de `**`.
6. **Project Settings > Data API**: copie a **Project URL** e cole em `assets/config.js`.

### 2. GitHub Pages

1. Crie um repositório **público** (ex.: `controle-projetos`) e envie esta pasta (sem a pasta `backup-repo`, que é opcional aqui).
2. **Settings > Pages**: em *Source* escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`.
3. Em um ou dois minutos o site fica no ar em `https://SEU-USUARIO.github.io/controle-projetos/`.

O repositório pode ser público sem risco: o código não dá acesso a nenhum dado. Quem protege os dados são as regras de acesso do banco.

### 3. Backup semanal (recomendado)

1. Crie um repositório **privado** (ex.: `controle-projetos-backup`).
2. Copie para ele a pasta `.github` que está em `backup-repo/`.
3. No repositório privado, em **Settings > Secrets and variables > Actions**, crie:
   - `SUPABASE_URL`: a Project URL
   - `SUPABASE_SECRET_KEY`: a chave **secret** (Project Settings > API Keys)
4. Em **Actions**, rode o "backup semanal" uma vez para testar.

A rotina roda toda segunda-feira e também mantém o projeto ativo no Supabase. No plano gratuito, projetos sem nenhum acesso por 7 dias são pausados.

Para uma cópia manual, use **ajustes > baixar backup** na gestão e guarde o arquivo no OneDrive. O mesmo arquivo restaura os dados em **ajustes > restaurar de um arquivo**.

### 4. IA (opcional)

Sem configurar nada, os botões de IA copiam um prompt pronto e abrem o Claude para você colar.

Para ver a resposta dentro da plataforma, crie uma chave em [console.anthropic.com](https://console.anthropic.com) e cole em **ajustes > inteligência artificial**. A chave fica salva só no seu navegador, e o uso é cobrado na sua conta da API.

## Uso

- Envie aos setores o link do formulário: `https://SEU-USUARIO.github.io/controle-projetos/pedido.html`
- Entre na gestão pelo endereço principal. No celular, use "adicionar à tela inicial" para instalar como app.
- O painel mostra os pedidos novos desde a sua última visita e tudo que precisa de atenção.

## Limites do plano gratuito (Supabase)

- 500 MB de banco: suficiente para dezenas de milhares de pedidos.
- 1 GB de arquivos anexados, até 50 MB por arquivo.
- Pausa após 7 dias sem acesso. O backup semanal evita isso.
