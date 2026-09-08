import { completeness, FundingProvider, Opportunity, ProviderResult } from '@/lib/opportunity';

const URL = 'https://www.mass.gov/current-funding-opportunities';

function clean(value: string) {
  return value.replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

function normalizeDate(raw?: string) {
  if (!raw) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.valueOf()) ? raw.trim() : parsed.toISOString().slice(0, 10);
}

export const massGovProvider: FundingProvider = {
  name: 'Massachusetts OGR',
  async search(query: string, limit: number): Promise<ProviderResult> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(URL, {
        headers: { 'User-Agent': 'OpenFunding/0.3 funding discovery prototype' },
        redirect: 'follow', signal: controller.signal, next: { revalidate: 900 },
      }).finally(() => clearTimeout(timer));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();

      // Mass.gov renders opportunity titles as headings/buttons. Capture each heading and the text until the next heading.
      const headingRegex = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
      const headings = [...html.matchAll(headingRegex)];
      const rows: Opportunity[] = [];
      const q = query.toLowerCase();
      const checked = new Date().toISOString();

      for (let i = 0; i < headings.length; i++) {
        const title = clean(headings[i][1]);
        if (!title || /current opportunities|contact us|office of grants/i.test(title)) continue;
        const start = (headings[i].index || 0) + headings[i][0].length;
        const end = headings[i + 1]?.index || Math.min(start + 5000, html.length);
        const blockHtml = html.slice(start, end);
        const block = clean(blockHtml);
        if (!/deadline|rolling|letter of intent|applications?/i.test(block)) continue;
        const searchable = `${title} ${block}`.toLowerCase();
        if (q && !searchable.includes(q)) continue;

        const deadlineMatch = block.match(/Deadline:\s*([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i);
        const rolling = /rolling basis/i.test(block);
        const linkMatch = blockHtml.match(/href=["']([^"']+)["'][^>]*>[^<]*(?:Learn More|Apply|Details)/i) || blockHtml.match(/href=["']([^"']+)["']/i);
        let url = linkMatch?.[1] || URL;
        if (url.startsWith('/')) url = `https://www.mass.gov${url}`;

        const item: Opportunity = {
          id: `mass-${hash(title)}`,
          providerId: title,
          source: 'Massachusetts OGR', sourceKind: 'web', sourceTier: 'state', title,
          funder: 'Massachusetts Office of Grants and Research',
          status: 'Open', category: 'State', categories: ['State'], eligibility: [],
          deadline: rolling ? 'Rolling' : normalizeDate(deadlineMatch?.[1]),
          deadlineType: rolling ? 'rolling' : deadlineMatch ? 'fixed' : 'unknown',
          geography: 'Massachusetts', url,
          description: block.slice(0, 420) || 'Massachusetts state funding opportunity.',
          lastChecked: checked, detailAvailable: false,
        };
        item.dataCompleteness = completeness(item);
        rows.push(item);
        if (rows.length >= limit) break;
      }
      if (rows.length === 0 && !query) throw new Error('Page was reachable but no opportunities could be parsed');
      return { provider: 'Massachusetts OGR', opportunities: rows, total: rows.length, note: 'Live state opportunity page' };
    } catch (error) {
      return { provider: 'Massachusetts OGR', opportunities: [], error: error instanceof Error ? error.message : String(error) };
    }
  },
};
