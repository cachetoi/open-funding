import { promises as fs } from 'fs';
import path from 'path';
import type { Opportunity } from './opportunity';
import { searchableText } from './opportunity';

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'opportunities.json');

type StoreShape = { version: 1; updatedAt: string; opportunities: Opportunity[] };

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as StoreShape;
    return parsed?.opportunities ? parsed : { version: 1, updatedAt: new Date(0).toISOString(), opportunities: [] };
  } catch {
    return { version: 1, updatedAt: new Date(0).toISOString(), opportunities: [] };
  }
}

export async function upsertOpportunities(incoming: Opportunity[]) {
  if (!incoming.length) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
  const store = await readStore();
  const map = new Map(store.opportunities.map(item => [item.id, item]));
  const now = new Date().toISOString();
  for (const item of incoming) {
    const old = map.get(item.id);
    map.set(item.id, {
      ...old,
      ...item,
      firstSeen: old?.firstSeen || item.firstSeen || now,
      lastSeen: now,
    });
  }
  const opportunities = [...map.values()]
    .sort((a,b) => (b.lastSeen || '').localeCompare(a.lastSeen || '')); // no artificial record cap
  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify({ version: 1, updatedAt: now, opportunities } satisfies StoreShape, null, 2), 'utf8');
  await fs.rename(tmp, DATA_FILE);
}

export async function searchStored(query: string, limit?: number) {
  const store = await readStore();
  const q = query.trim().toLowerCase();
  const rows = q ? store.opportunities.filter(x => searchableText(x).includes(q)) : store.opportunities;
  return typeof limit === 'number' ? rows.slice(0, limit) : rows;
}

export async function storeStats() {
  const store = await readStore();
  return { count: store.opportunities.length, updatedAt: store.updatedAt, path: '.data/opportunities.json' };
}
