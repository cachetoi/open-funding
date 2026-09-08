import { FundingProvider, Opportunity, ProviderResult, completeness } from '@/lib/opportunity';
import { absoluteUrl, cleanHtml, dateFromText, fetchHtml, hash } from './webSource';

type Config = {
  name: string; url: string; funder: string; geography: string; category?: string;
  include?: RegExp; exclude?: RegExp; note?: string;
};

export function makeOfficialPageProvider(c: Config): FundingProvider {
  return {
    name: c.name,
    async search(query: string): Promise<ProviderResult> {
      try {
        const html = await fetchHtml(c.url, 'OpenFunding/0.10 public-funding-discovery');
        const q = query.trim().toLowerCase();
        const checked = new Date().toISOString();
        const rows: Opportunity[] = [];
        const seen = new Set<string>();
        const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
        for (const m of links) {
          const href = absoluteUrl(m[1], c.url);
          const title = cleanHtml(m[2]).replace(/\s+/g, ' ').trim();
          if (title.length < 8 || title.length > 240) continue;
          if (/^(home|contact|learn more|read more|apply|details|click here|grants?|funding)$/i.test(title)) continue;
          if (c.exclude?.test(title)) continue;
          const grantish = c.include?.test(title) || /grant|fund|award|opportunit|rfp|nofo|nofa|initiative|program|fellowship|assistance|americorps/i.test(title);
          if (!grantish) continue;
          if (seen.has(href + '|' + title.toLowerCase())) continue;
          const idx = m.index || 0;
          const context = cleanHtml(html.slice(Math.max(0, idx - 350), Math.min(html.length, idx + m[0].length + 850)));
          const searchable = `${title} ${context}`.toLowerCase();
          if (q && !searchable.includes(q)) continue;
          const deadline = dateFromText(context);
          const item: Opportunity = {
            id: `official-${hash(`${c.name}:${href}:${title}`)}`,
            providerId: href, source: c.name, sourceKind: 'web', sourceTier: 'state',
            title, funder: c.funder, status: 'Published on official source',
            category: c.category || 'State', categories: [c.category || 'State'], eligibility: [],
            deadline, deadlineType: deadline ? 'fixed' : 'unknown', geography: c.geography,
            url: href, description: context.slice(0, 520) || `${c.geography} funding opportunity published by ${c.funder}.`,
            lastChecked: checked, detailAvailable: false,
          };
          item.dataCompleteness = completeness(item); rows.push(item); seen.add(href + '|' + title.toLowerCase());
        }
        return { provider: c.name, opportunities: rows, total: rows.length,
          coverage: 'partial', retrievalMethod: 'html', pagesFetched: 1,
          note: c.note || 'Official public funding page. HTML extraction is best-effort; Source Health labels this connector partial until a structured feed/API is available.' };
      } catch (error) {
        return { provider: c.name, opportunities: [], error: error instanceof Error ? error.message : String(error), coverage: 'unknown', retrievalMethod: 'html' };
      }
    },
  };
}
