import { completeness, type Opportunity } from '@/lib/opportunity';

export function cleanHtml(value = '') {
  return value
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&ndash;|&mdash;/g, '–')
    .replace(/\s+/g, ' ').trim();
}

export function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

export function absoluteUrl(href: string, origin: string) {
  try { return new URL(href, origin).toString(); } catch { return origin; }
}

export function normalizeDate(raw?: string) {
  if (!raw) return undefined;
  const cleaned = raw.replace(/\s+at\s+.*$/i, '').replace(/,?\s+by\s+.*$/i, '').trim();
  const parsed = new Date(cleaned);
  return Number.isNaN(parsed.valueOf()) ? cleaned : parsed.toISOString().slice(0, 10);
}

export function dateFromText(text: string) {
  const patterns = [
    /(?:due|deadline|apply by|applications? due|application close date)\s*:?\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
    /(?:due|deadline|apply by|applications? due|application close date)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  ];
  for (const p of patterns) { const m = text.match(p); if (m) return normalizeDate(m[1]); }
  return undefined;
}

export function amountRangeFromText(text: string) {
  const dollars = [...text.matchAll(/\$\s*([\d,.]+)\s*(million|billion|m|k)?/gi)].map(m => {
    let n = Number(m[1].replace(/,/g, ''));
    const suffix = (m[2] || '').toLowerCase();
    if (suffix === 'k') n *= 1_000;
    if (suffix === 'm' || suffix === 'million') n *= 1_000_000;
    if (suffix === 'billion') n *= 1_000_000_000;
    return n;
  }).filter(Number.isFinite);
  if (!dollars.length) return {};
  return { amountMin: dollars.length > 1 ? Math.min(...dollars) : undefined, amountMax: Math.max(...dollars) };
}

export function finish(item: Opportunity) {
  item.dataCompleteness = completeness(item);
  return item;
}

export async function fetchHtml(url: string, userAgent = 'OpenFunding/0.6 public-funding-discovery') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': userAgent }, redirect: 'follow', signal: controller.signal, next: { revalidate: 900 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally { clearTimeout(timer); }
}
