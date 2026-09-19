# Rachão · Meia Boca Juniors

App web pra divisão justa de times do Meia Boca. Cada jogador entra pelo celular, faz auto-avaliação e avalia os coleguinhas. No dia do jogo, marca quem veio e sorteia dois times equilibrados.

Stack: **React (Vite) + Supabase + Vercel**. Tudo grátis nos free tiers.

> Live in production: https://fut.fabianamoratelli.com.br

---

## Setup rápido (10–15 min)

### 1. Supabase (banco de dados)

1. Cria conta em [supabase.com](https://supabase.com)
2. **New project** → nome, região (São Paulo é a mais próxima), senha do DB
3. Espera provisionar (~2 min)
4. **SQL Editor** → **New query** → cola o conteúdo de `supabase/schema.sql` → **Run**
5. **New query** de novo → cola o conteúdo de `supabase/schema-privacy.sql` → **Run**
6. **New query** de novo → cola o conteúdo de `supabase/schema-positions.sql` → **Run**
7. **Project Settings → API** → copia:
   - **Project URL** (`VITE_SUPABASE_URL`)
   - **anon public key** (`VITE_SUPABASE_ANON_KEY`)

O `schema-privacy.sql` é a camada que isola as notas por jogador. Ele fecha a leitura direta da tabela `assessments` (só o técnico logado enxerga tudo) e expõe três funções — `get_my_progress`, `get_my_assessment` e `save_my_assessment` — que devolvem ou gravam só o que aquele jogador precisa: se já fez a auto-avaliação, quem ele já avaliou e a nota que ele mesmo deu. Assim ninguém abre o console do navegador e puxa a tabela inteira. É aditivo (pode rodar num projeto que já tem dados). As funções recebem o ID do jogador que fica no `localStorage`, então continua sendo um modelo de confiança do grupo, não autenticação.

O `schema-positions.sql` adiciona as posições (ataque/meio/defesa) às jogadoras e a função `get_draw_profiles`, que o sorteio público (`/sortear`) usa: devolve só a nota final já combinada por atributo — nunca uma avaliação individual — porque a tabela `assessments` fica trancada pro anon.

### 2. Rodar local

```bash
cp .env.example .env
# preenche com os valores do Supabase
npm install
npm run dev
```

Abre em `http://localhost:5173`.

### 3. Deploy no Vercel

Via CLI (mais rápido):

```bash
npm i -g vercel
vercel login
vercel        # primeira vez, responde as perguntas
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod
```

Ou pelo painel do Vercel: importa o repo do GitHub, cola as env vars, deploy.

### 4. Subdomínio

1. Vercel → seu projeto → **Settings → Domains** → adiciona `rachao.meiaboca.com.br` (ou o que for)
2. Vercel mostra o CNAME → cria no teu provedor de DNS apontando pra `cname.vercel-dns.com`
3. Espera propagar (uns minutos)

### 5. Login admin

1. Acessa `rachao.meiaboca.com.br/admin/login`
2. Digita o email → **enviar link mágico**
3. Abre o email → clica no link → tá dentro

**Trancar acesso admin só ao teu email:**
- Supabase → **Authentication → Providers → Email** → desabilita "Enable Sign ups"
- Aí só emails já cadastrados manualmente conseguem entrar

---

## Como funciona

- **`/`** — home: "sortear times" (público) ou "fazer avaliação" / "minha avaliação" (se o celular já é reconhecido)
- **`/entrar`** — escolhe o nome (ou cadastra) → vai pra `/eu`
- **`/eu/posicoes`** — 1º acesso: escolhe posição principal e secundária (editável depois pelo `/eu`)
- **`/eu`** — auto-avaliação + avaliar cada coleguinha. Salvo por localStorage
- **`/sortear`** — público, sem login: marca quem veio e sorteia. Não mostra nota nenhuma
- **`/admin`** — só a técnica (com login). Vê médias, remove jogadora, marca quem veio, sorteia (com mini-perfil)

### Fórmula da média

Pra cada atributo (menos "nota geral"):
```
final = auto × 0.3 + média_dos_outros × 0.7
```

Nota geral vem só das avaliações dos outros (evita gente se achando Messi).

Overall = média simples dos 10 atributos.

### Algoritmo do sorteio

600 combinações aleatórias; cada uma recebe `diferença de força por atributo + 3 × desequilíbrio de ataque + 3 × desequilíbrio de defesa` (principal vale 1, secundária 0,5; meio é coringa e não entra; quem não definiu posição conta 0). Pega as 3% melhores e sorteia entre elas. Sempre parelho, mas nunca a mesma escalação.

---

## Testar responsividade antes do deploy

Com `npm run dev` rodando em outro terminal:

```bash
npm run test:viewport
```

Abre cada tela (home, `/eu`, formulários, login, admin elenco e sorteio) em Chrome headless a 360/375/393px, com o Supabase mockado (não grava nada), e lista qualquer elemento que vaze a viewport. Screenshots ficam em `.viewport-test/`. Precisa de Chrome ou Edge instalado (`CHROME=<caminho>` se não achar sozinho).

---

## Customizar atributos

Edita `src/lib/attributes.js`. Não precisa mexer no banco (scores são JSON).

---

## Segurança

Modelo **"grupo de amigos"**: qualquer um com o link cadastra-se e avalia. Ideal pra grupo fechado de zap. Não é feito pra web pública.

---

## Créditos

Escudo e nome © Meia Boca Juniors 😅

Licença: faz o que quiser.
