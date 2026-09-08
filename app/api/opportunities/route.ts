import { NextRequest, NextResponse } from 'next/server';
import { providers } from '@/lib/providers';
import { dedupeOpportunities } from '@/lib/dedupe';
import { searchStored, storeStats, upsertOpportunities } from '@/lib/store';
import type { Opportunity } from '@/lib/opportunity';
import { withDerivedTags } from '@/lib/tagging';

function facets(items: Opportunity[]) {
  const count = (values: (string | undefined)[]) => Object.entries(values.filter(Boolean).reduce<Record<string, number>>((acc, value) => { acc[value!] = (acc[value!] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]);
  return {
    sources: count(items.map(x=>x.source)), tiers: count(items.map(x=>x.sourceTier)), statuses: count(items.map(x=>x.status||'Status not listed')),
    geographies: count(items.map(x=>x.geography)), categories: count(items.flatMap(x=>x.categories?.length?x.categories:[x.category]).filter(Boolean)),
    deadlineTypes: count(items.map(x=>x.deadlineType==='rolling'?'Rolling':x.deadline?'Has deadline':'Deadline not listed')),
    eligibility: count(items.flatMap(x=>x.eligibility||[])),
  };
}
function deadlineTime(x:Opportunity){if(!x.deadline||x.deadlineType==='rolling')return Number.MAX_SAFE_INTEGER;const n=Date.parse(x.deadline);return Number.isNaN(n)?Number.MAX_SAFE_INTEGER:n}

export async function GET(req: NextRequest) {
  const q=req.nextUrl.searchParams.get('q')?.trim()||'';
  // Adapters exhaust every record their public source exposes. Display pagination happens in the browser, not here.
  const settled=await Promise.all(providers.map(p=>p.search(q,Number.MAX_SAFE_INTEGER)));
  const live=dedupeOpportunities(settled.flatMap(r=>r.opportunities)).map(withDerivedTags);
  try{await upsertOpportunities(live)}catch{/* local persistence should never break search */}
  const stored=await searchStored(q);
  const opportunities=dedupeOpportunities([...live,...stored]).map(withDerivedTags).sort((a,b)=>deadlineTime(a)-deadlineTime(b));
  const stats=await storeStats();
  const sourceRows=settled.map(r=>({name:r.provider,returned:r.opportunities.length,total:r.total??r.opportunities.length,ok:!r.error,error:r.error||undefined,note:r.note}));
  const reportedTotal=sourceRows.reduce((sum,s)=>sum+(s.total||0),0);
  return NextResponse.json({count:opportunities.length,opportunities,facets:facets(opportunities),sources:sourceRows,reportedTotal,availableSources:providers.map(p=>p.name),store:stats});
}
