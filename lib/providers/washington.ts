import type { FundingProvider, Opportunity, ProviderResult } from '@/lib/opportunity';
import { absoluteUrl, amountRangeFromText, cleanHtml, dateFromText, fetchHtml, finish, hash } from './webSource';

const URL = 'https://fundhub.wa.gov/funding-opportunities/';
const ORIGIN = 'https://fundhub.wa.gov';

export const washingtonProvider: FundingProvider = {
  name: 'Washington FundHubWA',
  async search(query: string, limit: number): Promise<ProviderResult> {
    try {
      const html = await fetchHtml(URL);
      const q = query.toLowerCase(); const checked = new Date().toISOString(); const rows: Opportunity[] = [];
      // FundHub is JS-enhanced, but opportunity links are also rendered/discoverable when present.
      const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']*\/funding\/[^"'#?]+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
      const seen = new Set<string>();
      for (const m of links) {
        const href = absoluteUrl(m[1], ORIGIN); const title = cleanHtml(m[2]);
        if (title.length < 10 || seen.has(href) || /find funding|learn more|apply now/i.test(title)) continue;
        seen.add(href);
        const around = cleanHtml(html.slice(Math.max(0, (m.index || 0) - 1400), Math.min(html.length, (m.index || 0) + 2600)));
        if (q && !`${title} ${around}`.toLowerCase().includes(q)) continue;
        const amounts = amountRangeFromText(around); const deadline = dateFromText(around);
        rows.push(finish({ id:`wa-${hash(href)}`, providerId:href, source:'Washington FundHubWA', sourceKind:'web', sourceTier:'state', title, funder:'Washington State / listed funding agency', status:/closed/i.test(around)?'Closed':/upcoming/i.test(around)?'Upcoming':'Active', category:'State', categories:['State'], opportunityType:(around.match(/\b(Grant|Loan|Rebate|Incentive|Competition|Cooperative Agreement|Request For Proposal)\b/i)?.[1]), fundingInstruments:[], eligibility:[], ...amounts, deadline, deadlineType:deadline?'fixed':'unknown', geography:'Washington', url:href, description:around.slice(0,520)||'Funding opportunity listed by Washington FundHubWA.', lastChecked:checked, detailAvailable:false }));
        if (rows.length >= limit) break;
      }
      if (!rows.length) return { provider:'Washington FundHubWA', opportunities:[], total:0, note:'Official portal connected; its listing table is client-rendered, so live records may be unavailable to this lightweight adapter.' };
      return { provider:'Washington FundHubWA', opportunities:rows, total:rows.length, note:'Official Washington Department of Commerce funding portal' };
    } catch (error) { return { provider:'Washington FundHubWA', opportunities:[], error:error instanceof Error?error.message:String(error) }; }
  }
};
