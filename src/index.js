import { config, assertConfig } from "./config.js";
import { REGIONS, LINK_KEYWORDS } from "./sources.js";
import { getNews, getLinks } from "./fetch.js";
import { summarizeForTelegram } from "./summarize.js";
import { sendTelegram } from "./telegram.js";
import { loadState, isNew, markSeen, pruneState, saveState } from "./state.js";

function localHour() {
  const h = new Intl.DateTimeFormat("en-GB", {
    timeZone: config.timezone, hour: "numeric", hour12: false,
  }).format(new Date());
  return parseInt(h, 10) % 24;
}
function dateLabel() {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: config.timezone, day: "numeric", month: "long", year: "numeric",
  }).format(new Date());
}

async function gatherRegion(region, state) {
  const collected = [];
  for (const q of region.newsQueries) collected.push(...(await getNews(q)));
  for (const src of region.linkSources) collected.push(...(await getLinks(src, LINK_KEYWORDS)));

  const seenLink = new Set(), seenTitle = new Set(), unique = [];
  for (const it of collected) {
    const tkey = it.title.toLowerCase().replace(/\s+/g, " ").slice(0, 80);
    if (!it.link || seenLink.has(it.link) || (tkey && seenTitle.has(tkey))) continue;
    seenLink.add(it.link); if (tkey) seenTitle.add(tkey);
    unique.push(it);
  }
  const fresh = [];
  for (const it of unique) {
    if (isNew(state, it.link)) { markSeen(state, it.link); fresh.push(it); }
  }
  console.log(`# ${region.name}: ${collected.length} raccolti, ${unique.length} unici, ${fresh.length} NUOVI`);
  return { name: region.name, items: fresh };
}

function fallbackBlock(items) {
  return items.slice(0, 8).map((it) => {
    const emoji = it.kind.startsWith("atto") ? "📄" : "📰";
    return `${emoji} ${it.title}\nFonte: ${it.source} · ${it.link}`;
  }).join("\n\n");
}

function regionMessage(regionName, label, body) {
  const tag = `#trasfusionale #SIMT #${regionName}`;
  return `🩸 NOTIZIE TRASFUSIONALI · ${regionName.toUpperCase()}\n📅 ${label}\n\n${body}\n\n${tag}`;
}

async function main() {
  assertConfig();

  // Una sola esecuzione, alle 08:00 locali (due cron UTC + questa guardia gestiscono il DST).
  if (!config.bypassTimeGuard && localHour() !== config.targetHour) {
    console.log(`Ora locale != ${config.targetHour}:00 — esco.`);
    return;
  }

  const label = dateLabel();
  console.log(`Briefing Telegram del ${label} — raccolta (con memoria anti-duplicati)...`);

  const state = await loadState();
  const regionsData = [];
  for (const region of REGIONS) regionsData.push(await gatherRegion(region, state));

  const withItems = regionsData.filter((r) => r.items.length > 0);
  const total = withItems.reduce((n, r) => n + r.items.length, 0);
  console.log(`Totale nuovi: ${total}`);

  if (total === 0) {
    if (config.alwaysPost) {
      await sendTelegram(`🩸 NOTIZIE TRASFUSIONALI\n📅 ${label}\n\nNessuna novità rilevante oggi.\n\n#trasfusionale`);
      console.log("Postato heartbeat 'nessuna novità'.");
    } else {
      console.log("Nessuna novità — niente post (canale pulito).");
    }
    pruneState(state); await saveState(state);
    return;
  }

  // Sintesi per regione (un'unica chiamata; fallback a elenco grezzo se il JSON non è valido).
  let perRegion;
  try {
    perRegion = await summarizeForTelegram(withItems, label);
  } catch (e) {
    console.warn("Sintesi fallita, uso il fallback grezzo:", e.message);
    perRegion = {};
    for (const r of withItems) perRegion[r.name] = fallbackBlock(r.items);
  }

  // Posta un messaggio per ciascuna regione che ha novità (sezioni categorizzate).
  let posted = 0;
  for (const r of withItems) {
    const body = (perRegion[r.name] && perRegion[r.name].trim()) || fallbackBlock(r.items);
    await sendTelegram(regionMessage(r.name, label, body));
    posted++;
    console.log(`✓ Postato canale: ${r.name}`);
  }
  console.log(`✓ ${posted} messaggi inviati.`);

  // Persisti la memoria solo dopo aver postato.
  pruneState(state);
  await saveState(state);
  console.log("✓ Memoria aggiornata.");
}

main().catch((e) => {
  console.error("Errore fatale:", e);
  process.exit(1);
});
