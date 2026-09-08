import type { FundingProvider, Opportunity, ProviderResult } from '@/lib/opportunity';
import { absoluteUrl, amountRangeFromText, cleanHtml, dateFromText, fetchHtml, finish, hash } from './webSource';

const URL = 'https://www.pa.gov/grants';
const ORIGIN = 'https://www.pa.gov';

export const pennsylvaniaProvider: FundingProvider = {
  name: 'Pennsylvania Grants',
  async search(query: string, limit: number): Promise<ProviderResult> {
    try {
      const html=await fetchHtml(URL); const q=query.toLowerCase(); const checked=new Date().toISOString(); const rows:Opportunity[]=[]; const seen=new Set<string>();
      const links=[...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
      for(const m of links){
        const title=cleanHtml(m[2]); if(title.length<12||title.length>180||!/grant|fund|loan|program|opportunity|credit|agreement/i.test(title))continue;
        const href=absoluteUrl(m[1],ORIGIN); if(!href.includes('pa.gov')||seen.has(href)||href===URL)continue; seen.add(href);
        const around=cleanHtml(html.slice(Math.max(0,(m.index||0)-1200),Math.min(html.length,(m.index||0)+2200)));
        if(q&&!`${title} ${around}`.toLowerCase().includes(q))continue;
        const deadline=dateFromText(around); const amounts=amountRangeFromText(around);
        rows.push(finish({id:`pa-${hash(href)}`,providerId:href,source:'Pennsylvania Grants',sourceKind:'web',sourceTier:'state',title,funder:'Commonwealth of Pennsylvania',status:'Listed',category:'State',categories:['State'],opportunityType:around.match(/\b(Grant|Loan|Tax Credit|Cooperative Agreement|Delegation Agreement)\b/i)?.[1],fundingInstruments:[],eligibility:[],...amounts,deadline,deadlineType:deadline?'fixed':'unknown',geography:'Pennsylvania',url:href,description:around.slice(0,500)||'Funding opportunity listed by the Commonwealth of Pennsylvania.',lastChecked:checked,detailAvailable:false}));
        if(rows.length>=limit)break;
      }
      return {provider:'Pennsylvania Grants',opportunities:rows,total:rows.length,note:rows.length?'Official statewide grants portal':'Official statewide portal connected; no server-rendered opportunity cards were available to this adapter.'};
    }catch(error){return{provider:'Pennsylvania Grants',opportunities:[],error:error instanceof Error?error.message:String(error)}}
  }
};
