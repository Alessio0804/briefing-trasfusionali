# Briefing Trasfusionali → Canale Telegram

Agente che **ogni mattina alle 08:00 (ora di Roma)** controlla le novità sui reparti/servizi trasfusionali (SIMT), officine trasfusionali, Centri Regionali Sangue, piani sangue, nomine di primari, concorsi e delibere in **Marche, Abruzzo e Molise**, e le pubblica su un **canale Telegram dedicato**, **categorizzate per regione** (un messaggio per Abruzzo, Molise, Marche, con hashtag `#trasfusionale #SIMT #Regione`).

Il post nel canale è anche la **notifica**: Telegram ti avvisa sul telefono. Niente Google Drive, niente server.

Gira su **GitHub Actions** (gratis), con **memoria anti-duplicati**: nel canale finisce solo ciò che è nuovo.

---

## Come funziona

1. Una volta al giorno (08:00 Roma) lo script raccoglie da:
   - **Google News** (per regione/città/keyword),
   - **elenchi atti istituzionali** (BUR Abruzzo, delibere Molise, atti Marche, albi/concorsi ASL), da cui prende solo i link con titolo trasfusionale.
2. Confronta con la memoria (`state/seen.json`) → tiene **solo i nuovi**.
3. Claude redige le novità divise per regione.
4. Il bot **posta un messaggio per regione** nel canale. La memoria viene aggiornata e committata.

Nei giorni senza novità non posta nulla (canale pulito). Metti `ALWAYS_POST=true` se vuoi comunque un "nessuna novità" giornaliero.

---

## Setup (~10 min)

### 1) Repository
Crea un repo GitHub (anche privato) e carica i file mantenendo le cartelle (`src/`, `.github/workflows/`, `state/`).

### 2) Bot + canale Telegram
1. In Telegram apri **@BotFather** → `/newbot` → segui le istruzioni → ottieni il **token** del bot.
2. Crea un **canale** (es. "Notizie Trasfusionali"). Può essere privato.
3. Apri il canale → **Amministratori** → aggiungi il tuo bot come admin con permesso di **pubblicare messaggi**.
4. Ricava l'**ID del canale** (`TELEGRAM_CHAT_ID`):
   - **Canale pubblico**: usa direttamente `@nomecanale`.
   - **Canale privato**: posta un messaggio qualsiasi nel canale, poi apri
     `https://api.telegram.org/bot<TOKEN>/getUpdates` e copia il valore `chat.id` (formato `-100xxxxxxxxxx`).
     In alternativa inoltra un messaggio del canale a **@userinfobot**.

### 3) Secrets su GitHub
Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Nome | Valore |
|------|--------|
| `ANTHROPIC_API_KEY` | la tua chiave API Anthropic |
| `TELEGRAM_BOT_TOKEN` | il token del bot |
| `TELEGRAM_CHAT_ID` | `@nomecanale` o `-100xxxxxxxxxx` |

(Facoltativo, sotto **Variables**: `ANTHROPIC_MODEL`, default `claude-haiku-4-5-20251001`.)

### 4) Test
Repo → **Actions → Briefing Trasfusionali → Run workflow**: l'avvio manuale ignora l'orario e posta subito. La **prima** volta (memoria vuota) pubblica molto; dalle successive solo le novità.

---

## Personalizzazione (`src/sources.js`)
- `newsQueries`, `linkSources`, `LINK_KEYWORDS` (parole-chiave trasfusionali per filtrare gli atti).
- Orario: `TARGET_HOUR` e i due `cron` nel workflow (sono in UTC).
- `NEWS_WINDOW`, `MEMORY_DAYS`, `ALWAYS_POST`.

---

## Note e limiti (onesti)
- **BUR Marche in PDF**: coperto via news + sito trasfusionale regionale; il parsing dei PDF dei bollettini è il prossimo upgrade possibile.
- **Estrazione link best effort**: alcune pagine sono form di ricerca e rendono poco; si affina con URL più mirati in `linkSources`.
- **Memoria** in `state/seen.json`, committata dal workflow (serve `permissions: contents: write`, già impostato). Le due run giornaliere non confliggono: quella "sbagliata" per il fuso esce subito senza toccare nulla.
- **Schedule GitHub**: può subire ritardi sotto carico e si disattiva dopo ~60 giorni di inattività del repo. Costi Actions/Anthropic per un job giornaliero breve: minimi.
- Il briefing **segnala**, non sostituisce l'atto ufficiale: verifica sempre delibera/decreto prima di agire.

Riferimento API: <https://docs.claude.com/en/api/overview>
