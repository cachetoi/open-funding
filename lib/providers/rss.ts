import { completeness, FundingProvider, Opportunity, ProviderResult } from '@/lib/opportunity';

export type RssSource = {
  name: string;
  url: string;
  funder: string;
  category: string;
  geography?: string;
};

function decode(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? decode(match[1]) : '';
}

function linkFrom(block: string) {
  const normal = tag(block, 'link');
  if (normal) return normal;
  const href = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i)?.[1];
  return href ? decode(href) : '';
}

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

export function makeRssProvider(source: RssSource): FundingProvider {
  return {
    name: source.name,
    async search(query: string, limit: number): Promise<ProviderResult> {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(source.url, {
          headers: { 'User-Agent': 'OpenFunding/0.3 funding discovery prototype' },
          redirect: 'follow',
          signal: controller.signal,
          next: { revalidate: 900 },
        }).finally(() => clearTimeout(timer));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const xml = await response.text();
        const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
        if (blocks.length === 0) throw new Error('Feed returned no recognizable RSS/Atom entries');

        const q = query.toLowerCase();
        const lastChecked = new Date().toISOString();
        const opportunities: Opportunity[] = [];
        for (const block of blocks) {
          const title = tag(block, 'title');
          const description = tag(block, 'description') || tag(block, 'summary') || tag(block, 'content');
          const link = linkFrom(block);
          const date = tag(block, 'pubDate') || tag(block, 'updated') || tag(block, 'published') || tag(block, 'dc:date');
          const guid = tag(block, 'guid') || tag(block, 'id') || link || title;
          const searchable = `${title} ${description} ${source.funder}`.toLowerCase();
          if (q && !searchable.includes(q)) continue;
          const item: Opportunity = {
            id: `rss-${hash(`${source.name}:${guid}`)}`,
            providerId: guid,
            source: source.name,
            sourceKind: 'rss',
            sourceTier: 'federal',
            title: title || 'Untitled opportunity',
            funder: source.funder,
            category: source.category,
            categories: [source.category],
            eligibility: [],
            postedDate: date,
            deadlineType: 'unknown',
            geography: source.geography || 'United States',
            url: link,
            description: description || 'Funding opportunity from an official RSS feed.',
            lastChecked,
            detailAvailable: false,
          };
          item.dataCompleteness = completeness(item);
          opportunities.push(item);
          if (opportunities.length >= limit) break;
        }
        return { provider: source.name, opportunities, total: opportunities.length };
      } catch (error) {
        return { provider: source.name, opportunities: [], error: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}
