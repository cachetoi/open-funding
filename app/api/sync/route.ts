import { NextRequest, NextResponse } from 'next/server';
import { providers } from '@/lib/providers';
import { persistSync, databaseConfigured } from '@/lib/db';
import { dedupeOpportunities } from '@/lib/dedupe';
import { withDerivedTags } from '@/lib/tagging';
import type { ProviderResult } from '@/lib/opportunity';

export const maxDuration = 300;

export async function GET(req:NextRequest){
  if(!databaseConfigured())return NextResponse.json({error:'DATABASE_URL is not configured'},{status:503});
  const secret=process.env.CRON_SECRET;
  if(secret && req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Unauthorized'},{status:401});
  const settled:ProviderResult[]=await Promise.all(providers.map(async p=>{
    try{return await p.search('',Number.MAX_SAFE_INTEGER)}catch(e){return {provider:p.name,opportunities:[],error:e instanceof Error?e.message:'Provider failed',coverage:'unknown' as const}}
  }));
  // Deduplicate within each source before persistence; cross-source dedupe still happens at read time.
  const cleaned=settled.map(r=>({...r,opportunities:dedupeOpportunities(r.opportunities).map(withDerivedTags)}));
  const result=await persistSync(cleaned);
  return NextResponse.json({ok:true,...result});
}
