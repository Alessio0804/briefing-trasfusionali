import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

const client = new Anthropic({ apiKey: config.anthropicApiKey });

const SYSTEM = `Sei un analista che prepara brevi notiziari trasfusionali per Telegram, in italiano, per un professionista del settore diagnostico trasfusionale (Grifols Blood Transfusion Solutions) che presidia Marche, Abruzzo e Molise.

Riceverai un elenco di voci GIÀ selezionate come pertinenti e nuove, tutte di UNA singola regione. Tipi di voce:
- "atto/BUR" = atto ufficiale (Bollettino Regionale, albo, concorso, delibera) → priorità alta, mettilo per primo.
- "news" = stampa locale.

Rielabora TUTTE le voci fornite (unisci solo i veri duplicati che parlano della stessa identica notizia). Per ciascuna voce scrivi ESATTAMENTE in questo formato, su tre righe:
📄 Titolo sintetico riformulato        (usa 📄 per "atto/BUR", 📰 per "news")
Una frase chiara che spiega la notizia e perché conta per il settore trasfusionale.
Fonte: <fonte> · <url>

Separa le voci con UNA riga vuota.
Regole rigide: NON scrivere introduzioni, titoli, intestazioni di regione, date o conclusioni. Solo le voci. Niente markdown, niente grassetto o asterischi: solo testo semplice. Scrivi SEMPRE qualcosa, non restituire mai una risposta vuota.`;

// Riassume le voci di UNA regione in testo semplice pronto per Telegram.
export async function summarizeRegion(regionName, items, dateLabel) {
  let list = "";
  for (const it of items) {
    list += `- [${it.kind}] ${it.title}\n  fonte: ${it.source} | url: ${it.link}`;
    if (it.snippet) list += `\n  estratto: ${it.snippet}`;
    list += "\n";
  }

  const msg = await client.messages.create({
    model: config.model,
    max_tokens: 1500,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Regione: ${regionName}. Elabora tutte le voci seguenti nel formato richiesto.\n\n${list}`,
      },
    ],
  });

  return (msg.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
