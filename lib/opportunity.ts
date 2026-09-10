export type SourceKind = 'api' | 'rss' | 'web' | 'dataset';

export type EstimateBasis =
  | 'historical-federal-awards'
  | 'irs-990-pf'
  | 'source-derived'
  | 'historical-international-awards';

export type SourceTier =
  | 'federal'
  | 'state'
  | 'local'
  | 'foundation'
  | 'international'
  | 'multilateral'
  | 'university'
  | 'corporate'
  | 'other';

export type GeographyScope =
  | 'local'
  | 'state'
  | 'national'
  | 'regional'
  | 'international'
  | 'worldwide'
  | 'unknown';

export type GlobeAlignmentLevel = 'high' | 'medium' | 'low';

export type GlobeAlignment = {
  score: GlobeAlignmentLevel;
  reasons?: string[];
};

export type Opportunity = {
  id: string;
  providerId: string;

  // Source information
  source: string;
  sourceKind: SourceKind;
  sourceTier?: SourceTier;
  sourceCountry?: string;
  sourceRegion?: string;

  // Core opportunity information
  title: string;
  funder: string;
  funderEin?: string;
  agencyCode?: string;
  subagency?: string;
  number?: string;

  assistanceListings?: {
    number: string;
    title?: string;
  }[];

  status?: string;

  // Categories / intelligence
  category?: string;
  categories?: string[];
  topicTags?: string[];
  populations?: string[];
  fundingUses?: string[];

  /**
   * More explicit applicant classification.
   *
   * Examples:
   * nonprofit
   * school
   * university
   * research-institution
   * government
   * community-group
   * individual
   * business
   */
  eligibleApplicants?: string[];

  /**
   * Programs, frameworks, or initiatives this opportunity
   * may align with.
   *
   * Examples:
   * GLOBE
   * UN-SDGs
   * STEM-Education
   * Citizen-Science
   * Earth-Observation
   */
  programAlignment?: string[];

  /**
   * OpenFunding-derived assessment of whether an opportunity
   * may support GLOBE-related environmental science activities.
   *
   * This is an inferred compatibility signal — not an endorsement
   * or guarantee of eligibility from the GLOBE Program.
   */
  globeAlignment?: GlobeAlignment;

  /**
   * Convenience flag for opportunities that appear to allow
   * equipment purchases.
   */
  equipmentEligible?: boolean;

  /**
   * Specific equipment categories inferred or explicitly allowed.
   *
   * Examples:
   * environmental-monitoring
   * water-quality
   * soil-testing
   * weather-station
   * sensors
   * laboratory-equipment
   * computers
   * gps
   */
  equipmentTypes?: string[];

  intelligenceMethod?: 'rules' | 'ai' | 'hybrid';
  intelligenceVersion?: string;
  taggingMethod?: 'source' | 'rules' | 'ai';

  opportunityType?: string;
  fundingInstruments?: string[];

  // Eligibility
  eligibility: string[];

  /**
   * Countries where applicants may be eligible.
   * Prefer ISO 3166-1 alpha-2 country codes where possible.
   *
   * Examples:
   * ['US']
   * ['GB']
   * ['KE']
   * ['US', 'CA', 'MX']
   *
   * Use ['WORLDWIDE'] when appropriate.
   */
  eligibleCountries?: string[];

  /**
   * Optional subdivisions or regions.
   *
   * Examples:
   * Massachusetts
   * England
   * East Africa
   * European Union
   */
  eligibleRegions?: string[];

  geographyScope?: GeographyScope;

  /**
   * Existing human-readable geography field.
   *
   * Keep this for backwards compatibility with the current UI.
   *
   * Examples:
   * Massachusetts
   * United States
   * European Union
   * Kenya
   * Worldwide
   */
  geography: string;

  // Funding
  amountMin?: number;
  amountMax?: number;
  totalFunding?: number;
  expectedAwards?: number;

  /**
   * ISO 4217 currency code where known.
   *
   * Examples:
   * USD
   * GBP
   * EUR
   * CAD
   * AUD
   */
  currency?: string;

  estimatedAmountMin?: number;
  estimatedAmountMax?: number;
  estimateBasis?: EstimateBasis;
  estimateConfidence?: 'low' | 'medium' | 'high';

  // Dates
  postedDate?: string;
  openDate?: string;
  deadline?: string;
  deadlineType?: 'fixed' | 'rolling' | 'unknown';

  costSharing?: boolean;

  // Source URL / description
  url: string;
  description: string;

  // Contact
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;

  // Data tracking
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

  coverage?: 'complete' | 'partial' | 'unknown';

  retrievalMethod?: 'api' | 'rss' | 'html' | 'dataset';

  pagesFetched?: number;

  /**
   * Optional provider-level geography metadata.
   * Useful for international connectors.
   */
  country?: string;
  region?: string;
};

export interface FundingProvider {
  name: string;
  search(query: string, limit: number): Promise<ProviderResult>;
}

export function completeness(item: Opportunity) {
  const fields = [
    item.title,
    item.funder,
    item.status,
    item.category,
    item.opportunityType,
    item.eligibility?.length,
    item.amountMin,
    item.amountMax,
    item.postedDate,
    item.deadline,
    item.geography,
    item.description,
    item.costSharing,
    item.currency,
    item.eligibleCountries?.length,
    item.eligibleApplicants?.length,
    item.fundingUses?.length,
  ];

  const filled = fields.filter(
    (value) =>
      value !== undefined &&
      value !== '' &&
      value !== null &&
      value !== 0
  ).length;

  return Math.round((filled / fields.length) * 100);
}

export function searchableText(item: Opportunity) {
  return [
    item.title,
    item.funder,
    item.number,
    item.status,
    item.category,

    ...(item.categories || []),
    ...(item.topicTags || []),
    ...(item.populations || []),
    ...(item.fundingUses || []),
    ...(item.eligibility || []),
    ...(item.eligibleApplicants || []),

    item.geography,
    item.geographyScope,
    ...(item.eligibleCountries || []),
    ...(item.eligibleRegions || []),

    item.sourceCountry,
    item.sourceRegion,

    item.currency,

    ...(item.programAlignment || []),

    item.equipmentEligible ? 'equipment equipment eligible' : '',
    ...(item.equipmentTypes || []),

    item.globeAlignment?.score
      ? `globe globe-program ${item.globeAlignment.score}`
      : '',

    ...(item.globeAlignment?.reasons || []),

    item.description,

    ...(item.fundingInstruments || []),

    ...(item.assistanceListings || []).flatMap((x) => [
      x.number,
      x.title || '',
    ]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}