// Configurazione letta dalle variabili d'ambiente (GitHub Secrets).
export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",

  // Canale Telegram di destinazione.
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || "",
    // ID del canale: @nomecanale (pubblico) oppure -100xxxxxxxxxx (privato).
    chatId: process.env.TELEGRAM_CHAT_ID || "",
  },

  timezone: process.env.TIMEZONE || "Europe/Rome",
  targetHour: parseInt(process.env.TARGET_HOUR || "8", 10), // una sola esecuzione, ogni mattina
  bypassTimeGuard: String(process.env.BYPASS_TIME_GUARD || "").toLowerCase() === "true",

  newsWindowDays: parseInt(process.env.NEWS_WINDOW || "14", 10),
  // Se true, posta "nessuna novità" anche nei giorni vuoti (heartbeat). Default false = canale pulito.
  alwaysPost: String(process.env.ALWAYS_POST || "false").toLowerCase() === "true",

  maxNewsPerQuery: 8,
  maxLinksPerSource: 25,
  memoryDays: parseInt(process.env.MEMORY_DAYS || "60", 10),
  maxMsgChars: 3900, // limite Telegram 4096: margine di sicurezza
};

export function assertConfig() {
  const missing = [];
  if (!config.anthropicApiKey) missing.push("ANTHROPIC_API_KEY");
  if (!config.telegram.token) missing.push("TELEGRAM_BOT_TOKEN");
  if (!config.telegram.chatId) missing.push("TELEGRAM_CHAT_ID");
  if (missing.length) throw new Error("Variabili d'ambiente mancanti: " + missing.join(", "));
}
