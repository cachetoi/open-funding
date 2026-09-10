import type {
  FundingProvider,
  Opportunity,
  ProviderResult,
} from '@/lib/opportunity';

import { withDerivedTags } from '@/lib/tagging';

import {
  absoluteUrl,
  cleanHtml,
  fetchHtml,
  finish,
  hash,
  normalizeDate,
} from './webSource';

function now() {
  return new Date().toISOString();
}

function containsQuery(text: string, query: string) {
  if (!query.trim()) return true;

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean);

  const haystack = text.toLowerCase();

  return terms.some((term) => haystack.includes(term));
}

function parseMoneyValue(raw: string) {
  const cleaned = raw
    .replace(/[,£$€CAUD]/gi, '')
    .trim();

  const match = cleaned.match(
    /([\d.]+)\s*(billion|million|thousand|bn|m|k)?/i
  );

  if (!match) return undefined;

  let value = Number(match[1]);

  if (!Number.isFinite(value)) return undefined;

  const suffix = (match[2] || '').toLowerCase();

  if (suffix === 'k' || suffix === 'thousand') {
    value *= 1_000;
  }

  if (suffix === 'm' || suffix === 'million') {
    value *= 1_000_000;
  }

  if (suffix === 'bn' || suffix === 'billion') {
    value *= 1_000_000_000;
  }

  return value;
}

function parseMoneyRange(text: string, symbol: string) {
  const escaped =
    symbol === '$' ? '\\$' :
    symbol === '£' ? '£' :
    symbol === '€' ? '€' :
    symbol;

  const matches = [
    ...text.matchAll(
      new RegExp(
        `${escaped}\\s*([\\d,.]+)\\s*(billion|million|thousand|bn|m|k)?`,
        'gi'
      )
    ),
  ]
    .map((match) => {
      return parseMoneyValue(
        `${match[1]} ${match[2] || ''}`
      );
    })
    .filter(
      (value): value is number =>
        value !== undefined && Number.isFinite(value)
    );

  if (!matches.length) return {};

  return {
    amountMin:
      matches.length >= 2
        ? Math.min(...matches)
        : undefined,

    amountMax: Math.max(...matches),
  };
}

function extractField(
  text: string,
  start: string,
  end?: string
) {
  const startIndex = text
    .toLowerCase()
    .indexOf(start.toLowerCase());

  if (startIndex === -1) return undefined;

  const valueStart = startIndex + start.length;

  if (!end) {
    return text.slice(valueStart).trim();
  }

  const endIndex = text
    .toLowerCase()
    .indexOf(
      end.toLowerCase(),
      valueStart
    );

  if (endIndex === -1) {
    return text.slice(valueStart).trim();
  }

  return text
    .slice(valueStart, endIndex)
    .trim();
}

function normalizeDeadline(raw?: string) {
  if (!raw) return undefined;

  if (
    /no deadline|open - no closing date|rolling/i.test(raw)
  ) {
    return undefined;
  }

  return normalizeDate(
    raw
      .replace(/\b(midnight|midday)\b/gi, '')
      .replace(/\b\d{1,2}:\d{2}(?:am|pm)?\b/gi, '')
      .replace(/\bUK time\b/gi, '')
      .trim()
  );
}

/* ------------------------------------------------------------------
   UK FIND A GRANT
------------------------------------------------------------------ */

const UK_GRANTS_ORIGIN =
  'https://find-government-grants.service.gov.uk';

async function fetchUkGrantPage(
  query: string,
  page: number
) {
  const params = new URLSearchParams();

  params.set('limit', '10');
  params.set('page', String(page));

  if (query.trim()) {
    params.set('searchTerm', query.trim());
  }

  return fetchHtml(
    `${UK_GRANTS_ORIGIN}/grants?${params.toString()}`
  );
}

function parseUkGrantCards(html: string) {
  const anchorPattern =
    /<a[^>]+href=["']([^"']*\/grants\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  const matches = [...html.matchAll(anchorPattern)];

  return matches.map((match, index) => {
    const next = matches[index + 1];

    const start = match.index || 0;

    const end =
      next?.index ??
      Math.min(html.length, start + 12000);

    const block = html.slice(start, end);

    return {
      href: match[1],
      title: cleanHtml(match[2]),
      text: cleanHtml(block),
    };
  });
}

export const ukFindAGrantProvider: FundingProvider = {
  name: 'UK Find a Grant',

  async search(
    query: string,
    limit: number
  ): Promise<ProviderResult> {
    try {
      const opportunities: Opportunity[] = [];

      const wanted = Math.min(
        Math.max(limit, 10),
        120
      );

      const pages = Math.min(
        Math.ceil(wanted / 10),
        12
      );

      const seen = new Set<string>();

      for (
        let page = 1;
        page <= pages &&
        opportunities.length < wanted;
        page++
      ) {
        const html = await fetchUkGrantPage(
          query,
          page
        );

        const cards = parseUkGrantCards(html);

        for (const card of cards) {
          const url = absoluteUrl(
            card.href,
            UK_GRANTS_ORIGIN
          );

          if (seen.has(url)) continue;
          seen.add(url);

          const text = card.text;

          if (
            query &&
            !containsQuery(
              `${card.title} ${text}`,
              query
            )
          ) {
            continue;
          }

          const location =
            extractField(
              text,
              'Location',
              'Funding organisation'
            ) || 'United Kingdom';

          const funder =
            extractField(
              text,
              'Funding organisation',
              'Who can apply'
            ) || 'UK Government';

          const eligibilityRaw =
            extractField(
              text,
              'Who can apply',
              'How much you can get'
            ) || '';

          const openingRaw =
            extractField(
              text,
              'Opening date',
              'Closing date'
            );

          const closingRaw =
            extractField(
              text,
              'Closing date'
            );

          const description =
            extractField(
              text,
              card.title,
              'Location'
            ) || text;

          const amounts =
            parseMoneyRange(text, '£');

          const item: Opportunity = {
            id: `uk-fag-${hash(url)}`,
            providerId: `uk-fag-${hash(url)}`,

            source: 'UK Find a Grant',
            sourceKind: 'web',
            sourceTier: 'federal',

            sourceCountry: 'GB',

            title: card.title,

            funder,

            status: 'Open',

            category: 'Government grant',

            eligibility:
              eligibilityRaw
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean),

            eligibleApplicants: [],

            amountMin: amounts.amountMin,
            amountMax: amounts.amountMax,

            currency: 'GBP',

            openDate:
              normalizeDate(openingRaw),

            deadline:
              normalizeDeadline(closingRaw),

            deadlineType:
              /rolling|year-round|no closing date/i.test(
                text
              )
                ? 'rolling'
                : closingRaw
                  ? 'fixed'
                  : 'unknown',

            geography: location,

            geographyScope:
              /international/i.test(location)
                ? 'international'
                : 'national',

            eligibleCountries:
              /international/i.test(location)
                ? ['WORLDWIDE']
                : ['GB'],

            url,

            description,

            lastChecked: now(),
          };

          opportunities.push(
            finish(
              withDerivedTags(item)
            )
          );

          if (
            opportunities.length >= wanted
          ) {
            break;
          }
        }
      }

      return {
        provider: 'UK Find a Grant',
        opportunities,
        total: opportunities.length,
        coverage: 'partial',
        retrievalMethod: 'html',
        pagesFetched: pages,
        country: 'GB',
      };
    } catch (error) {
      return {
        provider: 'UK Find a Grant',
        opportunities: [],
        error:
          error instanceof Error
            ? error.message
            : String(error),
        coverage: 'unknown',
        retrievalMethod: 'html',
        country: 'GB',
      };
    }
  },
};

/* ------------------------------------------------------------------
   GENERIC HTML TABLE PARSER
------------------------------------------------------------------ */

type ParsedRow = {
  cells: string[];
  url?: string;
};

function parseTableRows(
  html: string,
  origin: string
): ParsedRow[] {
  const rows = [
    ...html.matchAll(
      /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
    ),
  ];

  return rows
    .map((row) => {
      const body = row[1];

      const cells = [
        ...body.matchAll(
          /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi
        ),
      ].map((cell) =>
        cleanHtml(cell[1])
      );

      const href =
        body.match(
          /<a[^>]+href=["']([^"']+)["']/i
        )?.[1];

      return {
        cells,
        url: href
          ? absoluteUrl(href, origin)
          : undefined,
      };
    })
    .filter(
      (row) => row.cells.length >= 2
    );
}

/* ------------------------------------------------------------------
   CANADA FEDERAL RESEARCH FUNDING CALENDAR
------------------------------------------------------------------ */

const CANADA_RESEARCH_URL =
  'https://www.canada.ca/en/research-coordinating-committee/program-calendar.html';

export const canadaResearchProvider: FundingProvider = {
  name: 'Canada Research Funding Calendar',

  async search(
    query: string,
    limit: number
  ): Promise<ProviderResult> {
    try {
      const html =
        await fetchHtml(CANADA_RESEARCH_URL);

      const rows = parseTableRows(
        html,
        'https://www.canada.ca'
      );

      const opportunities: Opportunity[] = [];

      for (const row of rows) {
        if (row.cells.length < 3) continue;

        const agency = row.cells[0];
        const title = row.cells[1];

        if (
          /agenc(y|ies)/i.test(agency) ||
          /program\/award/i.test(title)
        ) {
          continue;
        }

        const deadlineRaw =
          row.cells[row.cells.length - 1];

        const searchable =
          row.cells.join(' ');

        if (
          query &&
          !containsQuery(searchable, query)
        ) {
          continue;
        }

        const url =
          row.url || CANADA_RESEARCH_URL;

        const item: Opportunity = {
          id: `ca-research-${hash(
            `${agency}-${title}-${deadlineRaw}`
          )}`,

          providerId: `ca-research-${hash(
            `${agency}-${title}-${deadlineRaw}`
          )}`,

          source:
            'Canada Federal Research Funding Calendar',

          sourceKind: 'web',
          sourceTier: 'federal',

          sourceCountry: 'CA',

          title,

          funder: agency,

          status:
            /open|no deadline|varies/i.test(
              deadlineRaw
            )
              ? 'Open'
              : 'Scheduled',

          category:
            'Research & innovation',

          eligibility: [
            'See official opportunity for eligibility',
          ],

          eligibleApplicants: [
            'university',
            'research-institution',
          ],

          currency: 'CAD',

          deadline:
            normalizeDeadline(deadlineRaw),

          deadlineType:
            /no deadline|open|varies/i.test(
              deadlineRaw
            )
              ? 'rolling'
              : 'fixed',

          geography: 'Canada',

          geographyScope: 'national',

          eligibleCountries: ['CA'],

          url,

          description:
            `${agency} funding opportunity listed in the Government of Canada integrated research funding calendar. ${title}.`,

          lastChecked: now(),
        };

        opportunities.push(
          finish(
            withDerivedTags(item)
          )
        );

        if (
          opportunities.length >= limit
        ) {
          break;
        }
      }

      return {
        provider:
          'Canada Research Funding Calendar',

        opportunities,

        total: opportunities.length,

        coverage: 'partial',

        retrievalMethod: 'html',

        pagesFetched: 1,

        country: 'CA',
      };
    } catch (error) {
      return {
        provider:
          'Canada Research Funding Calendar',

        opportunities: [],

        error:
          error instanceof Error
            ? error.message
            : String(error),

        coverage: 'unknown',

        retrievalMethod: 'html',

        country: 'CA',
      };
    }
  },
};

/* ------------------------------------------------------------------
   AUSTRALIA NHMRC FUNDING CALENDAR
------------------------------------------------------------------ */

const NHMRC_URL =
  'https://www.nhmrc.gov.au/funding/calendar';

export const australiaNhmrcProvider: FundingProvider = {
  name: 'Australia NHMRC Funding Calendar',

  async search(
    query: string,
    limit: number
  ): Promise<ProviderResult> {
    try {
      const html =
        await fetchHtml(NHMRC_URL);

      const rows = parseTableRows(
        html,
        'https://www.nhmrc.gov.au'
      );

      const opportunities: Opportunity[] = [];

      for (const row of rows) {
        if (row.cells.length < 3) continue;

        const title = row.cells[0];

        if (
          /funding scheme/i.test(title)
        ) {
          continue;
        }

        if (
          query &&
          !containsQuery(
            row.cells.join(' '),
            query
          )
        ) {
          continue;
        }

        const openRaw =
          row.cells[1];

        const deadlineRaw =
          row.cells[row.cells.length - 1];

        const url =
          row.url || NHMRC_URL;

        const item: Opportunity = {
          id: `au-nhmrc-${hash(
            `${title}-${deadlineRaw}`
          )}`,

          providerId: `au-nhmrc-${hash(
            `${title}-${deadlineRaw}`
          )}`,

          source:
            'Australian NHMRC Funding Calendar',

          sourceKind: 'web',
          sourceTier: 'federal',

          sourceCountry: 'AU',

          title,

          funder:
            'Australian National Health and Medical Research Council',

          status: 'Open / Upcoming',

          category:
            'Health & medical research',

          eligibility: [
            'See official funding scheme for eligibility',
          ],

          eligibleApplicants: [
            'university',
            'research-institution',
          ],

          currency: 'AUD',

          openDate:
            normalizeDate(openRaw),

          deadline:
            normalizeDeadline(deadlineRaw),

          deadlineType:
            /no deadline|rolling/i.test(
              deadlineRaw
            )
              ? 'rolling'
              : 'fixed',

          geography: 'Australia',

          geographyScope: 'national',

          eligibleCountries: ['AU'],

          url,

          description:
            `${title}. Current or upcoming Australian health and medical research funding opportunity listed by NHMRC.`,

          lastChecked: now(),
        };

        opportunities.push(
          finish(
            withDerivedTags(item)
          )
        );

        if (
          opportunities.length >= limit
        ) {
          break;
        }
      }

      return {
        provider:
          'Australia NHMRC Funding Calendar',

        opportunities,

        total: opportunities.length,

        coverage: 'partial',

        retrievalMethod: 'html',

        pagesFetched: 1,

        country: 'AU',
      };
    } catch (error) {
      return {
        provider:
          'Australia NHMRC Funding Calendar',

        opportunities: [],

        error:
          error instanceof Error
            ? error.message
            : String(error),

        coverage: 'unknown',

        retrievalMethod: 'html',

        country: 'AU',
      };
    }
  },
};

/* ------------------------------------------------------------------
   AUSTRALIAN RESEARCH COUNCIL
------------------------------------------------------------------ */

const ARC_URL =
  'https://www.arc.gov.au/funding-research/scheme-calendar';

export const australiaArcProvider: FundingProvider = {
  name: 'Australian Research Council',

  async search(
    query: string,
    limit: number
  ): Promise<ProviderResult> {
    try {
      const html =
        await fetchHtml(ARC_URL);

      const rows = parseTableRows(
        html,
        'https://www.arc.gov.au'
      );

      const opportunities: Opportunity[] = [];

      for (const row of rows) {
        const text =
          row.cells.join(' ');

        if (
          !text ||
          /scheme calendar|scheme name/i.test(
            text
          )
        ) {
          continue;
        }

        if (
          query &&
          !containsQuery(text, query)
        ) {
          continue;
        }

        const title = row.cells[0];

        if (!title || title.length < 5) {
          continue;
        }

        const item: Opportunity = {
          id: `au-arc-${hash(text)}`,
          providerId: `au-arc-${hash(text)}`,

          source:
            'Australian Research Council',

          sourceKind: 'web',
          sourceTier: 'federal',

          sourceCountry: 'AU',

          title,

          funder:
            'Australian Research Council',

          status: 'Upcoming',

          category:
            'Research & innovation',

          eligibility: [
            'See official ARC scheme for eligibility',
          ],

          eligibleApplicants: [
            'university',
            'research-institution',
          ],

          currency: 'AUD',

          geography: 'Australia',

          geographyScope: 'national',

          eligibleCountries: ['AU'],

          url: row.url || ARC_URL,

          description: text,

          lastChecked: now(),
        };

        opportunities.push(
          finish(
            withDerivedTags(item)
          )
        );

        if (
          opportunities.length >= limit
        ) {
          break;
        }
      }

      return {
        provider:
          'Australian Research Council',

        opportunities,

        total: opportunities.length,

        coverage: 'partial',

        retrievalMethod: 'html',

        pagesFetched: 1,

        country: 'AU',
      };
    } catch (error) {
      return {
        provider:
          'Australian Research Council',

        opportunities: [],

        error:
          error instanceof Error
            ? error.message
            : String(error),

        coverage: 'unknown',

        retrievalMethod: 'html',

        country: 'AU',
      };
    }
  },
};

/* ------------------------------------------------------------------
   GLOBAL ENVIRONMENT FACILITY / SMALL GRANTS PROGRAMME
------------------------------------------------------------------ */

const GEF_URL =
  'https://www.thegef.org/what-we-do/topics/gef-small-grants-program';

export const gefSmallGrantsProvider: FundingProvider = {
  name: 'GEF Small Grants Programme',

  async search(
    query: string,
    limit: number
  ): Promise<ProviderResult> {
    try {
      const html =
        await fetchHtml(GEF_URL);

      const text = cleanHtml(html);

      if (
        query &&
        !containsQuery(text, query)
      ) {
        return {
          provider:
            'GEF Small Grants Programme',

          opportunities: [],

          total: 0,

          coverage: 'partial',

          retrievalMethod: 'html',

          pagesFetched: 1,
        };
      }

      const dueMatch =
        text.match(
          /Applications are due ([A-Z][a-z]+ \d{1,2},? \d{4})/i
        );

      const item: Opportunity = {
        id: 'gef-sgp-cso-challenge',
        providerId:
          'gef-sgp-cso-challenge',

        source:
          'Global Environment Facility',

        sourceKind: 'web',

        sourceTier: 'multilateral',

        title:
          'GEF Small Grants Programme / CSO Challenge Program',

        funder:
          'Global Environment Facility',

        status: 'Open',

        category:
          'Environment & climate',

        categories: [
          'Environment',
          'Climate',
          'Biodiversity',
          'Community development',
        ],

        topicTags: [
          'Environment & climate',
          'Environmental science',
          'Biodiversity & conservation',
        ],

        populations: [
          'Community organizations',
          'Indigenous communities',
          'Youth',
          'Women',
        ],

        fundingUses: [
          'Capacity building',
          'Equipment & supplies',
          'Research & evaluation',
          'Education & outreach',
        ],

        eligibleApplicants: [
          'nonprofit',
          'community-group',
        ],

        eligibility: [
          'Civil society organizations',
          'Community-based organizations',
          'See official country/program rules',
        ],

        amountMax: 300000,

        currency: 'USD',

        deadline:
          normalizeDeadline(
            dueMatch?.[1]
          ),

        deadlineType:
          dueMatch
            ? 'fixed'
            : 'unknown',

        geography:
          'International',

        geographyScope:
          'international',

        eligibleCountries: [
          'WORLDWIDE',
        ],

        programAlignment: [
          'UN-SDGs',
          'Citizen-Science',
        ],

        url: GEF_URL,

        description:
          'Global environmental small-grants and CSO funding supporting community-led environmental solutions, biodiversity, sustainable agriculture, low-carbon energy, chemicals and waste, and sustainable urban solutions.',

        lastChecked: now(),
      };

      return {
        provider:
          'GEF Small Grants Programme',

        opportunities:
          limit > 0
            ? [
                finish(
                  withDerivedTags(item)
                ),
              ]
            : [],

        total: 1,

        coverage: 'partial',

        retrievalMethod: 'html',

        pagesFetched: 1,

        region: 'Global',
      };
    } catch (error) {
      return {
        provider:
          'GEF Small Grants Programme',

        opportunities: [],

        error:
          error instanceof Error
            ? error.message
            : String(error),

        coverage: 'unknown',

        retrievalMethod: 'html',

        region: 'Global',
      };
    }
  },
};