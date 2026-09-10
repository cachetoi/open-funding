import type { Opportunity } from './opportunity';

const TOPIC_RULES: Array<[string, RegExp]> = [
  ['Mental health', /mental health|behavioral health|suicide|substance use|addiction|opioid|trauma|counsel(?:ing|ling)|psychiatr/i],
  ['Public health', /public health|health equity|community health|disease prevention|maternal|infant health|epidemiolog|healthcare/i],
  ['Youth & children', /\byouth\b|children|child care|early childhood|adolescen|school-age|young people/i],
  ['Education', /education|school|teacher|student|literacy|learning|stem|college|university|academic/i],
  ['STEM education', /\bstem\b|science education|science learning|science classroom|science teacher|engineering education|technology education/i],
  ['Environmental science', /environmental science|earth science|ecology|ecosystem|environmental education|environmental research/i],
  ['Climate', /climate|climate change|climate resilience|climate adaptation|climate mitigation|global warming/i],
  ['Biodiversity & conservation', /biodiversity|conservation|habitat|wildlife|ecosystem|species|restoration/i],
  ['Water', /water quality|water monitoring|watershed|groundwater|surface water|freshwater|water testing|hydrolog/i],
  ['Soil & agriculture science', /soil quality|soil testing|soil science|soil health|agricultur|farm|farmer|food system/i],
  ['Atmosphere & weather', /weather|meteorolog|atmospher|air quality|precipitation|temperature monitoring|weather station/i],
  ['Earth observation', /earth observation|remote sensing|satellite|geospatial|gis|geographic information system/i],
  ['Citizen science', /citizen science|community science|participatory science|student data collection|community monitoring/i],
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
  ['Children & youth', /\byouth\b|children|child care|early childhood|adolescen|school-age|young people|students?/i],
  ['Schools', /\bschools?\b|primary school|secondary school|elementary school|high school|k-12|k12/i],
  ['Universities & colleges', /\buniversity\b|\buniversities\b|\bcollege\b|\bcolleges\b|higher education|postsecondary/i],
  ['Researchers', /\bresearchers?\b|scientists?|investigators?|research institution/i],
  ['Teachers & educators', /\bteachers?\b|\beducators?\b|faculty|instructors?/i],
  ['Families & caregivers', /famil(?:y|ies)|caregiver|parent|parenting/i],
  ['Older adults', /older adult|aging|elder|senior/i],
  ['People with disabilities', /disabilit|independent living|assistive technology/i],
  ['Veterans & military families', /veteran|military family|service member/i],
  ['Tribal communities', /tribal|tribe|native american|american indian|alaska native|indigenous/i],
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
  ['Equipment & supplies', /equipment|supplies|vehicle|hardware|purchase of equipment|scientific instrument|instrumentation/i],
  ['Scientific equipment', /scientific equipment|laboratory equipment|lab equipment|scientific instrument|instrumentation|field equipment/i],
  ['Environmental monitoring equipment', /environmental monitoring|monitoring equipment|water quality equipment|soil testing|weather station|air quality monitor|sensor|data logger/i],
  ['Computers & technology', /computer|laptop|tablet|hardware|technology equipment|digital equipment|information technology/i],
  ['Sensors & data collection', /sensor|data logger|probe|meter|monitoring device|data collection equipment|gps|global positioning system/i],
  ['Training & workforce', /training|professional development|workforce development|apprentice|credential/i],
  ['Teacher training', /teacher training|teacher professional development|educator training|faculty development/i],
  ['Student research', /student research|student-led research|student investigation|student project|student data collection/i],
  ['Education & outreach', /education|outreach|awareness|campaign|community engagement/i],
  ['Prevention', /prevention|preventive|risk reduction|early intervention/i],
  ['Emergency response', /emergency|disaster|response|recovery|relief/i],
  ['Technology & data', /technology|software|digital|cyber|data system|broadband|artificial intelligence/i],
];

const APPLICANT_RULES: Array<[string, RegExp]> = [
  ['nonprofit', /nonprofit|non-profit|not-for-profit|charit(?:y|ies|able)|ngo|nongovernmental organization/i],
  ['school', /\bschools?\b|k-12|k12|primary school|secondary school|elementary school|high school/i],
  ['university', /\buniversity\b|\buniversities\b|\bcollege\b|\bcolleges\b|higher education|postsecondary/i],
  ['research-institution', /research institution|research organization|scientific institution|research center|research centre/i],
  ['government', /government|government agency|municipal|municipality|local authority|public agency/i],
  ['community-group', /community group|community-based organization|grassroots organization|civil society organization/i],
  ['business', /small business|business entity|company|corporation|commercial organization/i],
  ['individual', /individual applicant|individuals may apply|researcher|investigator|student applicant/i],
];

const EQUIPMENT_TYPE_RULES: Array<[string, RegExp]> = [
  ['environmental-monitoring', /environmental monitoring|field monitoring|environmental measurement/i],
  ['water-quality', /water quality|water testing|ph meter|turbidity|dissolved oxygen|conductivity meter/i],
  ['soil-testing', /soil testing|soil quality|soil moisture|soil probe|soil meter/i],
  ['weather-station', /weather station|meteorological station|rain gauge|anemometer|barometer/i],
  ['air-quality', /air quality monitor|particulate monitor|air monitoring|pollution monitor/i],
  ['sensors', /sensor|probe|data logger|monitoring device/i],
  ['laboratory-equipment', /laboratory equipment|lab equipment|microscope|centrifuge|spectrometer/i],
  ['computers', /computer|laptop|tablet|desktop|chromebook/i],
  ['gps', /\bgps\b|global positioning system/i],
  ['remote-sensing', /remote sensing|satellite data|drone imagery|geospatial equipment/i],
];

const PROGRAM_ALIGNMENT_RULES: Array<[string, RegExp]> = [
  ['GLOBE', /\bglobe program\b|\bglobe schools?\b|global learning and observations to benefit the environment/i],
  ['UN-SDGs', /sustainable development goals?|\bsdgs?\b|agenda 2030/i],
  ['STEM-Education', /\bstem\b|science education|engineering education|technology education/i],
  ['Citizen-Science', /citizen science|community science|participatory science/i],
  ['Earth-Observation', /earth observation|remote sensing|satellite|geospatial/i],
];

function textFor(item: Opportunity) {
  return [
    item.title,
    item.description,
    item.category,
    ...(item.categories || []),
    ...(item.topicTags || []),
    ...(item.populations || []),
    ...(item.fundingUses || []),
    ...(item.fundingInstruments || []),
    ...(item.eligibility || []),
    ...(item.eligibleApplicants || []),
    ...(item.eligibleRegions || []),
    ...(item.programAlignment || []),
  ]
    .filter(Boolean)
    .join(' ');
}

function derive(
  rules: Array<[string, RegExp]>,
  text: string,
  max = 8
) {
  return [
    ...new Set(
      rules
        .filter(([, rx]) => rx.test(text))
        .map(([tag]) => tag)
    ),
  ].slice(0, max);
}

export function deriveTopicTags(item: Opportunity) {
  return derive(TOPIC_RULES, textFor(item), 12);
}

export function derivePopulations(item: Opportunity) {
  return derive(POPULATION_RULES, textFor(item), 8);
}

export function deriveFundingUses(item: Opportunity) {
  return derive(USE_RULES, textFor(item), 10);
}

export function deriveEligibleApplicants(item: Opportunity) {
  return derive(APPLICANT_RULES, textFor(item), 8);
}

export function deriveEquipmentTypes(item: Opportunity) {
  return derive(EQUIPMENT_TYPE_RULES, textFor(item), 10);
}

export function deriveProgramAlignment(item: Opportunity) {
  return derive(PROGRAM_ALIGNMENT_RULES, textFor(item), 8);
}

export function deriveGlobeAlignment(
  item: Opportunity
): Opportunity['globeAlignment'] {
  const text = textFor(item);

  const reasons: string[] = [];

  const explicitGlobe =
    /\bglobe program\b|\bglobe schools?\b|global learning and observations to benefit the environment/i.test(text);

  const environmental =
    /environment|climate|water|soil|weather|atmospher|biodiversity|earth science|ecology|conservation/i.test(text);

  const education =
    /school|student|teacher|education|university|college|stem/i.test(text);

  const monitoring =
    /monitoring|measurement|data collection|sensor|field research|citizen science|earth observation|remote sensing/i.test(text);

  const equipment =
    /equipment|supplies|instrument|sensor|probe|meter|weather station|computer|laboratory equipment/i.test(text);

  if (explicitGlobe) {
    reasons.push('Explicitly references the GLOBE Program or GLOBE schools');
  }

  if (environmental) {
    reasons.push('Supports environmental or Earth science activities');
  }

  if (education) {
    reasons.push('Supports schools, students, teachers, or universities');
  }

  if (monitoring) {
    reasons.push('Supports environmental measurement, monitoring, or data collection');
  }

  if (equipment) {
    reasons.push('May support equipment or scientific supplies');
  }

  if (explicitGlobe) {
    return {
      score: 'high',
      reasons,
    };
  }

  const signals = [
    environmental,
    education,
    monitoring,
    equipment,
  ].filter(Boolean).length;

  if (signals >= 3) {
    return {
      score: 'high',
      reasons,
    };
  }

  if (signals === 2) {
    return {
      score: 'medium',
      reasons,
    };
  }

  if (signals === 1) {
    return {
      score: 'low',
      reasons,
    };
  }

  return undefined;
}

export function withDerivedTags(item: Opportunity): Opportunity {
  const topicTags = [
    ...new Set([
      ...(item.topicTags || []),
      ...deriveTopicTags(item),
    ]),
  ];

  const populations = [
    ...new Set([
      ...(item.populations || []),
      ...derivePopulations(item),
    ]),
  ];

  const fundingUses = [
    ...new Set([
      ...(item.fundingUses || []),
      ...deriveFundingUses(item),
    ]),
  ];

  const eligibleApplicants = [
    ...new Set([
      ...(item.eligibleApplicants || []),
      ...deriveEligibleApplicants(item),
    ]),
  ];

  const equipmentTypes = [
    ...new Set([
      ...(item.equipmentTypes || []),
      ...deriveEquipmentTypes(item),
    ]),
  ];

  const programAlignment = [
    ...new Set([
      ...(item.programAlignment || []),
      ...deriveProgramAlignment(item),
    ]),
  ];

  const globeAlignment =
    item.globeAlignment || deriveGlobeAlignment(item);

  const equipmentEligible =
    item.equipmentEligible ??
    (
      fundingUses.includes('Equipment & supplies') ||
      fundingUses.includes('Scientific equipment') ||
      fundingUses.includes('Environmental monitoring equipment') ||
      equipmentTypes.length > 0
    );

  const hasDerivedIntelligence =
    topicTags.length > 0 ||
    populations.length > 0 ||
    fundingUses.length > 0 ||
    eligibleApplicants.length > 0 ||
    equipmentTypes.length > 0 ||
    programAlignment.length > 0 ||
    Boolean(globeAlignment);

  return {
    ...item,

    topicTags,
    populations,
    fundingUses,

    eligibleApplicants,

    equipmentEligible,
    equipmentTypes,

    programAlignment,
    globeAlignment,

    taggingMethod:
      topicTags.length > 0
        ? item.taggingMethod || 'rules'
        : item.taggingMethod,

    intelligenceMethod:
      hasDerivedIntelligence
        ? item.intelligenceMethod || 'rules'
        : item.intelligenceMethod,

    intelligenceVersion: 'v2-international-globe-rules',
  };
}