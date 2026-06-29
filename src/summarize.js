import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

const client = new Anthropic({ apiKey: config.anthropicApiKey });

const SYSTEM = `Sei un analista che prepara, in italiano, brevi notiziari trasfusionali per Telegram, destinati a un professionista del settore diagnostico trasfusionale (Grifols Blood Transfusion Solutions) che presidia Marche, Abruzzo e Molise.

Gli item che ricevi sono GIÀ FILTRATI come nuovi. Tipi:
- "atto/BUR": titoli di atti ufficiali (Bollettini Regionali, albi, concorsi, delibere) → priorità massima, affidabilità alta.
- "news": stampa locale → contesto.

Tieni SOLO ciò che riguarda reparti/servizi trasfusionali (SIMT/Medicina Trasfusionale), officine trasfusionali, Centri Regionali Sangue, piani sangue, nomine/cambi di direttori-primari, concorsi per dirigenti medici di medicina trasfusionale, riorganizzazioni di rete, gare/capitolati immunoematologia, aferesi, plasmaderivati, autosufficienza. Scarta cronaca generica, eventi e raccolte di routine senza elementi nuovi. Unisci i duplicati.

OUTPUT: rispondi SOLO con un oggetto JSON valido (niente \`\`\`, niente testo fuori dal JSON) con esattamente queste chiavi: "Abruzzo", "Molise", "Marche".
Ogni valore è TESTO SEMPLICE pronto per Telegram (NIENTE markdown, niente grassetto, niente HTML), che elenca le novità di quella regione, massimo 6, ciascuna così:
"📄 Titolo sintetico" per gli atti ufficiali, oppure "📰 Titolo sintetico" per le news, poi a capo 1 frase di sintesi, poi a capo "Fonte: <fonte> · <url>".
Separa le voci con una riga vuota.
Se una regione non ha novità pertinenti, il suo valore è stringa vuota "".`;

function safeParse(text) {
  let t = text.trim().replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  return JSON.parse(t);
}

// Ritorna { Abruzzo, Molise, Marche } con blocchi di testo (eventualmente vuoti).
export async function summarizeForTelegram(regionsData, dateLabel) {
  let digest = `Data: ${dateLabel}\n`;
  for (const r of regionsData) {
    digest += `\n===== ${r.name} =====\n`;
    for (const it of r.items) {
      digest += `• [${it.kind}] ${it.title} | fonte: ${it.source} | ${it.snippet} | ${it.link}\n`;
    }
  }

  const msg = await client.messages.create({
    model: config.model,
    max_tokens: 3000,
    system: SYSTEM,
    messages: [
      { role: "user", content: "Item nuovi di oggi. Produci il JSON per regione.\n\n" + digest },
    ],
  });

  const text = (msg.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const parsed = safeParse(text);
  return {
    Abruzzo: parsed.Abruzzo || "",
    Molise: parsed.Molise || "",
    Marche: parsed.Marche || "",
  };
}
