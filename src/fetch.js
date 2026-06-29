import Parser from "rss-parser";
import { config } from "./config.js";

const rss = new Parser({ timeout: 20000 });
const UA =
  "Mozilla/5.0 (compatible; BriefingTrasfusionaleBot/1.0; monitoraggio reparti trasfusionali)";

async function safeFetchText(url, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, "Accept-Language": "it-IT,it;q=0.9" },
      redirect: "follow",
    });
    if (!res.ok) return "";
    return await res.text();
  } catch (e) {
    console.warn(`  ! fetch fallito: ${url} (${e.message})`);
    return "";
  } finally {
    clearTimeout(t);
  }
}

export function htmlToText(html) {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|tr|h[1-6]|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'").replace(/&agrave;/gi, "à").replace(/&egrave;/gi, "è")
    .replace(/&igrave;/gi, "ì").replace(/&ograve;/gi, "ò").replace(/&ugrave;/gi, "ù")
    .replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
}

// Notizie da Google News (RSS), limitate alla finestra temporale.
export async function getNews(query) {
  const q = `${query} when:${config.newsWindowDays}d`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=it&gl=IT&ceid=IT:it`;
  const xml = await safeFetchText(url);
  if (!xml) return [];
  try {
    const feed = await rss.parseString(xml);
    return (feed.items || []).slice(0, config.maxNewsPerQuery).map((it) => ({
      title: it.title || "",
      link: it.link || "",
      date: it.isoDate || it.pubDate || "",
      source: (it.creator || (it.title && it.title.split(" - ").pop()) || "").trim(),
      snippet: htmlToText(it.contentSnippet || it.content || "").slice(0, 350),
      kind: "news",
    }));
  } catch {
    return [];
  }
}

// Estrae da una pagina-elenco (BUR/albo/concorsi) i link il cui titolo
// contiene una delle parole-chiave. Ogni link è un "item" deduplicabile.
export async function getLinks(url, keywords) {
  const html = await safeFetchText(url);
  if (!html) return [];
  let base;
  try { base = new URL(url); } catch { return []; }

  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const out = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) continue;
    const text = htmlToText(m[2]).trim();
    if (text.length < 8) continue;
    const hay = (text + " " + href).toLowerCase();
    if (!keywords.some((k) => hay.includes(k))) continue;
    let abs;
    try { abs = new URL(href, base).toString(); } catch { continue; }
    if (seen.has(abs)) continue;
    seen.add(abs);
    out.push({
      title: text.slice(0, 220),
      link: abs,
      date: "",
      source: base.hostname,
      snippet: "",
      kind: "atto/BUR",
    });
    if (out.length >= config.maxLinksPerSource) break;
  }
  return out;
}
