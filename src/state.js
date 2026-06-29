import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "./config.js";

// Memoria persistente degli URL già pubblicati (anti-duplicati tra i giorni).
// Salvata in state/seen.json e committata dal workflow dopo ogni run.

const STATE_DIR = "state";
const STATE_FILE = path.join(STATE_DIR, "seen.json");

export async function loadState() {
  try {
    const s = JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
    s.items = s.items || {};
    return s;
  } catch {
    return { items: {}, lastRun: null };
  }
}

export function isNew(state, link) {
  return !!link && !(link in state.items);
}

export function markSeen(state, link) {
  if (link) state.items[link] = new Date().toISOString();
}

export function pruneState(state) {
  const cutoff = Date.now() - config.memoryDays * 86400000;
  for (const [k, v] of Object.entries(state.items)) {
    const t = Date.parse(v);
    if (!Number.isNaN(t) && t < cutoff) delete state.items[k];
  }
}

export async function saveState(state) {
  state.lastRun = new Date().toISOString();
  await fs.mkdir(STATE_DIR, { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}
