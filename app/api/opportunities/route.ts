import { NextRequest, NextResponse } from 'next/server';
import { providers } from '@/lib/providers';
import { dedupeOpportunities } from '@/lib/dedupe';
import { searchIndexed, indexedStats, indexedSourceStatus, databaseConfigured } from '@/lib/db';
import type { Opportunity, ProviderResult } from '@/lib/opportunity';
import { withDerivedTags } from '@/lib/tagging';

function facets(items: Opportunity[]) {
  const count = (values: (string | undefined)[]) => Object.entries(values.filter(Boolean).reduce<Record<string, number>>((acc, value) => { acc[value!] = (acc[value!] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]);
  return {sources:count(items.map(x=>x.source)),tiers:count(items.map(x=>x.sourceTier)),statuses:count(items.map(x=>x.status||'Status not listed')),geographies:count(items.map(x=>x.geography)),categories:count(items.flatMap(x=>x.categories?.length?x.categories:[x.category]).filter(Boolean)),deadlineTypes:count(items.map(x=>x.deadlineType==='rolling'?'Rolling':x.deadline?'Has deadline':'Deadline not listed')),eligibility:count(items.flatMap(x=>x.eligibility||[]))};
}
function deadlineTime(x:Opportunity){if(!x.deadline||x.deadlineType==='rolling')return Number.MAX_SAFE_INTEGER;const n=Date.parse(x.deadline);return Number.isNaN(n)?Number.MAX_SAFE_INTEGER:n}

export async function GET(req:NextRequest){
  const q=req.nextUrl.searchParams.get('q')?.trim()||'';
  if(databaseConfigured()){
    const [indexed,status,stats]=await Promise.all([searchIndexed(q),indexedSourceStatus(),indexedStats()]);
    const opportunities=dedupeOpportunities(indexed||[]).map(withDerivedTags).sort((a,b)=>deadlineTime(a)-deadlineTime(b));
    const sourceRows=status||[];
    const reportedTotal=sourceRows.reduce((sum,s)=>sum+(s.total||0),0);
    return NextResponse.json({count:opportunities.length,opportunities,facets:facets(opportunities),sources:sourceRows,reportedTotal,availableSources:providers.map(p=>p.name),store:stats,indexMode:'postgres'});
  }
  // Local-development fallback: live adapters still work before a database is connected.
  const settled:ProviderResult[]=await Promise.all(providers.map(async p=>{try{return await p.search(q,Number.MAX_SAFE_INTEGER)}catch(e){return {provider:p.name,opportunities:[],error:e instanceof Error?e.message:'Provider failed',coverage:'unknown'}}}));
  const opportunities=dedupeOpportunities(settled.flatMap(r=>r.opportunities)).map(withDerivedTags).sort((a,b)=>deadlineTime(a)-deadlineTime(b));
  const sourceRows=settled.map(r=>({name:r.provider,returned:r.opportunities.length,total:r.total??r.opportunities.length,ok:!r.error,error:r.error||undefined,note:r.note,coverage:r.coverage||'unknown',retrievalMethod:r.retrievalMethod,pagesFetched:r.pagesFetched}));
  const reportedTotal=sourceRows.reduce((sum,s)=>sum+(s.total||0),0);
  return NextResponse.json({count:opportunities.length,opportunities,facets:facets(opportunities),sources:sourceRows,reportedTotal,availableSources:providers.map(p=>p.name),store:{count:opportunities.length,updatedAt:new Date().toISOString(),backend:'live-fallback'},indexMode:'live-fallback'});
}
