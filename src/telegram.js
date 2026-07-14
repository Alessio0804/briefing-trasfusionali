import { config } from "./config.js";

// Rende un testo semplice sicuro per il parse_mode HTML di Telegram e
// trasforma gli URL grezzi (spesso lunghissimi link Google News) in un
// link compatto cliccabile "apri", così il messaggio resta leggibile.
function toTelegramHtml(text) {
  const escText = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

  const urlRe = /(https?:\/\/[^\s]+)/g;
  let out = "";
  let last = 0;
  let m;
  while ((m = urlRe.exec(text)) !== null) {
    out += escText(text.slice(last, m.index));
    out += `<a href="${escAttr(m[1])}">apri</a>`;
    last = m.index + m[0].length;
  }
  out += escText(text.slice(last));
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Invia un messaggio al canale Telegram. Gli URL vengono compattati in link
// cliccabili tramite parse_mode HTML. Riprova su errori di rete o 5xx/429
// (un timeout momentaneo non deve far fallire l'intero briefing).
export async function sendTelegram(text) {
  const { token, chatId } = config.telegram;
  const body = {
    chat_id: chatId,
    text: toTelegramHtml(text.slice(0, config.maxMsgChars)),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  const maxAttempts = 4;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) return true;
      // 4xx (tranne 429) = errore permanente: inutile riprovare.
      if (res.status < 500 && res.status !== 429) {
        const t = await res.text().catch(() => "");
        throw new Error(`Telegram HTTP ${res.status}: ${t}`);
      }
      lastErr = new Error(`Telegram HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    if (attempt < maxAttempts) {
      const wait = 2000 * 2 ** (attempt - 1); // 2s, 4s, 8s
      console.warn(`Invio Telegram fallito (tentativo ${attempt}/${maxAttempts}): ${lastErr.message}. Riprovo tra ${wait / 1000}s...`);
      await sleep(wait);
    }
  }
  throw lastErr;
}
