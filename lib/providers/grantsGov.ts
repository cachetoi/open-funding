import { completeness, FundingProvider, Opportunity, OpportunityDetail, ProviderResult } from '@/lib/opportunity';

type GrantsSearchHit = {
  id: string | number;
  number?: string;
  title?: string;
  agencyCode?: string;
  agencyName?: string;
  openDate?: string;
  closeDate?: string;
  oppStatus?: string;
};

const SEARCH_URL = 'https://api.grants.gov/v1/api/search2';
const DETAIL_URL = 'https://api.grants.gov/v1/api/fetchOpportunity';

function cleanHtml(value?: string) {
  return (value || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export const grantsGovProvider: FundingProvider = {
  name: 'Grants.gov',
  async search(query: string, _limit: number): Promise<ProviderResult> {
    try {
      const pageSize = 100;
      async function page(startRecordNum: number) {
        const response = await fetch(SEARCH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: pageSize, startRecordNum, keyword: query, oppStatuses: 'forecasted|posted' }),
          next: { revalidate: 900 }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      }
      const first = await page(0);
      const total = Number(first?.data?.hitCount || 0);
      const starts:number[]=[]; for(let n=pageSize;n<total;n+=pageSize) starts.push(n);
      const pages:any[]=[first];
      // Exhaust every page, but use small batches so we do not hammer Grants.gov.
      for(let i=0;i<starts.length;i+=6){
        pages.push(...await Promise.all(starts.slice(i,i+6).map(n=>page(n))));
      }
      const hits: GrantsSearchHit[] = pages.flatMap(x=>x?.data?.oppHits||[]);
      const lastChecked = new Date().toISOString();
      const opportunities: Opportunity[] = hits.map((hit) => ({
        id: `grants-${hit.id}`, providerId: String(hit.id), source: 'Grants.gov', sourceKind: 'api', sourceTier: 'federal',
        title: hit.title || 'Untitled opportunity', funder: hit.agencyName || hit.agencyCode || 'Federal agency', agencyCode: hit.agencyCode || '',
        number: hit.number || '', status: hit.oppStatus || '', category: 'Federal', eligibility: [], openDate: hit.openDate || '', postedDate: hit.openDate || '',
        deadline: hit.closeDate || '', deadlineType: hit.closeDate ? 'fixed' : 'unknown', geography: 'United States',
        url: `https://www.grants.gov/search-results-detail/${hit.id}`, description: hit.number ? `Federal funding opportunity ${hit.number}.` : 'Federal funding opportunity.',
        lastChecked, detailAvailable: true
      }));
      opportunities.forEach((item) => { item.dataCompleteness = completeness(item); });
      return { provider: 'Grants.gov', opportunities, total, coverage: 'complete', retrievalMethod: 'api', pagesFetched: pages.length, note: `All ${opportunities.length.toLocaleString()} currently posted/forecasted matches loaded from paginated API` };
    } catch (error) {
      return { provider: 'Grants.gov', opportunities: [], error: String(error) };
    }
  }
};

export async function fetchGrantsGovDetail(providerId: string): Promise<OpportunityDetail> {
  const response = await fetch(DETAIL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ opportunityId: Number(providerId) }),
    next: { revalidate: 900 }
  });
  if (!response.ok) throw new Error(`Grants.gov returned ${response.status}`);
  const json = await response.json();
  const data = json?.data;
  if (!data) throw new Error('Opportunity not found');
  const synopsis = data.synopsis || {};
  const eligibility = (synopsis.applicantTypes || []).map((x: { description?: string }) => x.description).filter(Boolean);
  const fundingInstruments = (synopsis.fundingInstruments || []).map((x: { description?: string }) => x.description).filter(Boolean);
  const categories = (synopsis.fundingActivityCategories || []).map((x: { description?: string }) => x.description).filter(Boolean);
  const amount = (value: unknown) => {
    const raw = String(value ?? '').replace(/[^0-9.-]/g, '').trim();
    if (!raw) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  const yesNo = (value: unknown) => {
    if (typeof value === 'boolean') return value;
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw) return undefined;
    if (['yes', 'y', 'true', '1'].includes(raw)) return true;
    if (['no', 'n', 'false', '0'].includes(raw)) return false;
    return undefined;
  };

  const assistanceListings = (data.alns || []).map((x: { alnNumber?: string; programTitle?: string }) => ({ number: x.alnNumber || '', title: x.programTitle })).filter((x: { number: string }) => x.number);

  const result: OpportunityDetail = {
    id: `grants-${data.id}`,
    providerId: String(data.id),
    source: 'Grants.gov',
    sourceKind: 'api',
    sourceTier: 'federal',
    title: data.opportunityTitle || 'Untitled opportunity',
    funder: synopsis.agencyName || data.agencyDetails?.agencyName || data.owningAgencyCode || 'Federal agency',
    agencyCode: synopsis.agencyCode || data.owningAgencyCode || '',
    number: data.opportunityNumber || '',
    assistanceListings,
    status: data.docType || '',
    category: categories[0] || 'Federal',
    opportunityType: fundingInstruments[0],
    eligibility,
    amountMin: amount(synopsis.awardFloor),
    amountMax: amount(synopsis.awardCeiling),
    postedDate: synopsis.postingDate || '',
    openDate: synopsis.postingDate || '',
    deadline: synopsis.responseDate || synopsis.responseDateDesc || data.originalDueDateDesc || '',
    deadlineType: (synopsis.responseDate || synopsis.responseDateDesc || data.originalDueDateDesc) ? 'fixed' : 'unknown',
    geography: 'United States',
    url: `https://www.grants.gov/search-results-detail/${data.id}`,
    description: cleanHtml(synopsis.synopsisDesc) || 'No description provided.',
    lastChecked: new Date().toISOString(),
    detailAvailable: true,
    contactName: synopsis.agencyContactName || '',
    contactEmail: synopsis.agencyContactEmail || '',
    contactPhone: synopsis.agencyContactPhone || '',
    costSharing: yesNo(synopsis.costSharing),
    fundingInstruments,
    categories,
    totalFunding: amount(synopsis.estimatedTotalProgramFunding),
    expectedAwards: amount(synopsis.expectedNumberOfAwards),
  };
  result.dataCompleteness = completeness(result);
  return result;
}
