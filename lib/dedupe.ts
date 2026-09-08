import { Opportunity } from '@/lib/opportunity';

function normalizedTitle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function key(item: Opportunity) {
  if (item.number) return `number:${item.number.toLowerCase()}`;
  return `title:${normalizedTitle(item.title)}`;
}

export function dedupeOpportunities(items: Opportunity[]) {
  const seen = new Map<string, Opportunity>();
  for (const item of items) {
    const k = key(item);
    const existing = seen.get(k);
    if (!existing || (item.detailAvailable && !existing.detailAvailable)) seen.set(k, item);
  }
  return [...seen.values()];
}
