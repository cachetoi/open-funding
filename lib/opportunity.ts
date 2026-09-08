export type SourceKind = 'api' | 'rss' | 'web' | 'dataset';

export type EstimateBasis = 'historical-federal-awards' | 'irs-990-pf' | 'source-derived';

export type Opportunity = {
  id: string;
  providerId: string;
  source: string;
  sourceKind: SourceKind;
  sourceTier?: 'federal' | 'state' | 'local' | 'foundation' | 'other';
  title: string;
  funder: string;
  funderEin?: string;
  agencyCode?: string;
  subagency?: string;
  number?: string;
  assistanceListings?: { number: string; title?: string }[];
  status?: string;
  category?: string;
  categories?: string[];
  topicTags?: string[];
  populations?: string[];
  fundingUses?: string[];
  intelligenceMethod?: 'rules' | 'ai' | 'hybrid';
  intelligenceVersion?: string;
  taggingMethod?: 'source' | 'rules' | 'ai';
  opportunityType?: string;
  fundingInstruments?: string[];
  eligibility: string[];
  amountMin?: number;
  amountMax?: number;
  totalFunding?: number;
  expectedAwards?: number;
  estimatedAmountMin?: number;
  estimatedAmountMax?: number;
  estimateBasis?: EstimateBasis;
  estimateConfidence?: 'low' | 'medium' | 'high';
  postedDate?: string;
  openDate?: string;
  deadline?: string;
  deadlineType?: 'fixed' | 'rolling' | 'unknown';
  geography: string;
  costSharing?: boolean;
  url: string;
  description: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  lastChecked: string;
  firstSeen?: string;
  lastSeen?: string;
  detailAvailable?: boolean;
  dataCompleteness?: number;
};

export type OpportunityDetail = Opportunity;

export type ProviderResult = {
  provider: string;
  opportunities: Opportunity[];
  total?: number;
  error?: string;
  note?: string;
};

export interface FundingProvider {
  name: string;
  search(query: string, limit: number): Promise<ProviderResult>;
}

export function completeness(item: Opportunity) {
  const fields = [
    item.title, item.funder, item.status, item.category, item.opportunityType,
    item.eligibility?.length, item.amountMin, item.amountMax, item.postedDate,
    item.deadline, item.geography, item.description, item.costSharing,
  ];
  const filled = fields.filter((value) => value !== undefined && value !== '' && value !== null && value !== 0).length;
  return Math.round((filled / fields.length) * 100);
}

export function searchableText(item: Opportunity) {
  return [item.title, item.funder, item.number, item.status, item.category,
    ...(item.categories || []), ...(item.topicTags || []), ...(item.populations || []), ...(item.fundingUses || []), ...(item.eligibility || []), item.geography,
    item.description, ...(item.fundingInstruments || []),
    ...(item.assistanceListings || []).flatMap(x => [x.number, x.title || ''])]
    .filter(Boolean).join(' ').toLowerCase();
}
