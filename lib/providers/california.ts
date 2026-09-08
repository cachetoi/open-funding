import { completeness, FundingProvider, Opportunity, ProviderResult } from '@/lib/opportunity';

const HOME = 'https://www.grants.ca.gov/';

function clean(value = '') { return value.replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim(); }
function hash(input: string) { let h=2166136261; for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619)} return (h>>>0).toString(36); }
function absolute(url:string){ if(url.startsWith('http')) return url; return `https://www.grants.ca.gov${url.startsWith('/')?'':'/'}${url}`; }

export const californiaProvider: FundingProvider = {
  name: 'California Grants Portal',
  async search(query: string, limit: number): Promise<ProviderResult> {
    try {
      const controller = new AbortController(); const timer=setTimeout(()=>controller.abort(),12000);
      const res = await fetch(HOME,{headers:{'User-Agent':'OpenFunding/0.4 public-funding-discovery'},redirect:'follow',signal:controller.signal,next:{revalidate:900}}).finally(()=>clearTimeout(timer));
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const html=await res.text(); const portalText=clean(html); const currentCount=Number((portalText.match(/([\d,]+)\s+Current grant opportunities/i)?.[1]||'').replace(/,/g,''))||0; const q=query.toLowerCase(); const checked=new Date().toISOString(); const rows:Opportunity[]=[];
      // The public portal homepage exposes recently posted grants as ordinary links. This is a resilient fallback while the dataset adapter is expanded.
      const links=[...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
      for(const m of links){
        const title=clean(m[2]); const href=m[1];
        if(title.length<12 || title.length>220 || !/grant|program|fund|award|initiative|opportunity|loan/i.test(title)) continue;
        if(!href.includes('grants.ca.gov') && !href.startsWith('/')) continue;
        const search=`${title}`.toLowerCase(); if(q && !search.includes(q)) continue;
        const item:Opportunity={ id:`ca-${hash(`${href}:${title}`)}`,providerId:href,source:'California Grants Portal',sourceKind:'dataset',sourceTier:'state',title,funder:'State of California',status:'Open / current portal',category:'State',categories:['State'],eligibility:[],deadlineType:'unknown',geography:'California',url:absolute(href),description:'California state grant or loan opportunity published through the official California Grants Portal.',lastChecked:checked,detailAvailable:false };
        item.dataCompleteness=completeness(item); rows.push(item); if(rows.length>=limit) break;
      }
      // de-duplicate title/link noise from navigation
      const unique=[...new Map(rows.map(x=>[x.url,x])).values()];
      if(!unique.length) throw new Error('Portal reachable, but current opportunity links were not parseable');
      return {provider:'California Grants Portal',opportunities:unique,total:currentCount||unique.length,note:'Official California portal; current portal total reported separately while structured dataset ingestion is expanded'};
    } catch(error){ return {provider:'California Grants Portal',opportunities:[],error:error instanceof Error?error.message:String(error)}; }
  }
};
