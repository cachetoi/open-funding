import type { Opportunity } from './opportunity';

const TOPIC_RULES: Array<[string, RegExp]> = [
  ['Mental health', /mental health|behavioral health|suicide|substance use|addiction|opioid|trauma|counsel(?:ing|ling)|psychiatr/i],
  ['Public health', /public health|health equity|community health|disease prevention|maternal|infant health|epidemiolog|healthcare/i],
  ['Youth & children', /\byouth\b|children|child care|early childhood|adolescen|school-age|young people/i],
  ['Education', /education|school|teacher|student|literacy|learning|stem|college|university/i],
  ['Housing & homelessness', /housing|homeless|shelter|rental assistance|affordable housing/i],
  ['Workforce', /workforce|employment|job training|career|apprentice|economic mobility/i],
  ['Environment & climate', /climate|environment|conservation|clean energy|renewable|water quality|pollution|resilien/i],
  ['Arts & culture', /\barts?\b|culture|museum|music|theater|creative|historic preservation/i],
  ['Food & agriculture', /food security|nutrition|agricultur|farm|farmer|food system/i],
  ['Justice & safety', /justice|violence prevention|victim|criminal|legal services|public safety|reentry/i],
  ['Community development', /community development|neighborhood|civic|capacity building|technical assistance|community-based/i],
  ['Research', /research|clinical trial|scientific|investigator|study|evaluation/i],
  ['Technology & digital', /technology|digital|cyber|artificial intelligence|\bAI\b|broadband|data infrastructure/i],
  ['Disability', /disabilit|accessibility|assistive technology|independent living/i],
  ['Older adults', /older adult|aging|elder|senior/i],
  ['Veterans', /veteran|military family/i],
  ['Rural', /\brural\b|frontier/i],
];

const POPULATION_RULES: Array<[string, RegExp]> = [
  ['Children & youth', /\byouth\b|children|child care|early childhood|adolescen|school-age|young people/i],
  ['Families & caregivers', /famil(?:y|ies)|caregiver|parent|parenting/i],
  ['Older adults', /older adult|aging|elder|senior/i],
  ['People with disabilities', /disabilit|independent living|assistive technology/i],
  ['Veterans & military families', /veteran|military family|service member/i],
  ['Tribal communities', /tribal|tribe|native american|american indian|alaska native/i],
  ['Rural communities', /\brural\b|frontier/i],
  ['Low-income communities', /low[- ]income|poverty|economically disadvantaged|underserved|disadvantaged communit/i],
  ['People experiencing homelessness', /homeless|unsheltered|housing insecurity/i],
  ['Small businesses & entrepreneurs', /small business|entrepreneur|startup|microenterprise/i],
];

const USE_RULES: Array<[string, RegExp]> = [
  ['Direct services', /direct service|service delivery|provide services|treatment|case management|support services/i],
  ['Capacity building', /capacity building|organizational capacity|technical assistance|infrastructure support/i],
  ['Research & evaluation', /research|evaluation|study|clinical trial|data collection|evidence generation/i],
  ['Planning', /planning|needs assessment|strategic plan|feasibility|design phase/i],
  ['Capital & infrastructure', /capital improvement|construction|renovation|facility|infrastructure|building/i],
  ['Equipment & supplies', /equipment|supplies|vehicle|hardware|purchase of equipment/i],
  ['Training & workforce', /training|professional development|workforce development|apprentice|credential/i],
  ['Education & outreach', /education|outreach|awareness|campaign|community engagement/i],
  ['Prevention', /prevention|preventive|risk reduction|early intervention/i],
  ['Emergency response', /emergency|disaster|response|recovery|relief/i],
  ['Technology & data', /technology|software|digital|cyber|data system|broadband|artificial intelligence/i],
];

function textFor(item: Opportunity) {
  return [item.title,item.description,item.category,...(item.categories||[]),...(item.fundingInstruments||[]),...(item.eligibility||[])].filter(Boolean).join(' ');
}
function derive(rules:Array<[string,RegExp]>, text:string, max=8){return [...new Set(rules.filter(([,rx])=>rx.test(text)).map(([tag])=>tag))].slice(0,max)}
export function deriveTopicTags(item: Opportunity){return derive(TOPIC_RULES,textFor(item),8)}
export function derivePopulations(item: Opportunity){return derive(POPULATION_RULES,textFor(item),6)}
export function deriveFundingUses(item: Opportunity){return derive(USE_RULES,textFor(item),6)}

export function withDerivedTags(item: Opportunity): Opportunity {
  const topicTags=[...new Set([...(item.topicTags||[]),...deriveTopicTags(item)])];
  const populations=[...new Set([...(item.populations||[]),...derivePopulations(item)])];
  const fundingUses=[...new Set([...(item.fundingUses||[]),...deriveFundingUses(item)])];
  return {
    ...item, topicTags, populations, fundingUses,
    taggingMethod: topicTags.length ? (item.taggingMethod||'rules') : item.taggingMethod,
    intelligenceMethod: (topicTags.length||populations.length||fundingUses.length) ? (item.intelligenceMethod||'rules') : item.intelligenceMethod,
    intelligenceVersion: 'v1-rules'
  };
}
