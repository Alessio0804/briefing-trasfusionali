import { config } from "./config.js";

// Invia un messaggio (testo semplice) al canale Telegram.
export async function sendTelegram(text) {
  const { token, chatId } = config.telegram;
  const body = {
    chat_id: chatId,
    text: text.slice(0, config.maxMsgChars),
    disable_web_page_preview: true,
  };
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Telegram HTTP ${res.status}: ${t}`);
  }
  return true;
}
