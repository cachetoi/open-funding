import { completeness, FundingProvider, Opportunity, ProviderResult } from '@/lib/opportunity';

const SBIR_API_URL = 'https://api.www.sbir.gov/public/api/solicitations';

type SbirTopic = { topic_title?: string; topic_number?: string; topic_description?: string; sbir_topic_link?: string };
type SbirRow = {
  solicitation_title?: string; solicitation_number?: string; program?: string; phase?: string; agency?: string; branch?: string;
  release_date?: string; open_date?: string; close_date?: string; application_due_date?: string[] | string; current_status?: string;
  solicitation_agency_url?: string; solicitation_topics?: SbirTopic[];
};

function rowsFrom(json:any):SbirRow[]{
  if(Array.isArray(json)) return json;
  for(const key of ['results','data','solicitations']) if(Array.isArray(json?.[key])) return json[key];
  return [];
}
function due(row:SbirRow){const x=row.application_due_date; if(Array.isArray(x)&&x.length)return x[0]; if(typeof x==='string'&&x)return x; return row.close_date||''}

export const sbirProvider: FundingProvider = {
  name: 'SBIR/STTR',
  async search(query:string,_limit:number):Promise<ProviderResult>{
    try{
      const pageSize=50; let start=0; const all:SbirRow[]=[]; let pages=0;
      // The public API documents offset pagination but no total count. Continue until a short/empty page.
      while(true){
        const u=new URL(SBIR_API_URL); u.searchParams.set('open','1'); u.searchParams.set('rows',String(pageSize)); u.searchParams.set('start',String(start));
        if(query)u.searchParams.set('keyword',query);
        const r=await fetch(u,{next:{revalidate:1800}}); if(!r.ok)throw new Error(`HTTP ${r.status}`);
        const batch=rowsFrom(await r.json()); pages++; all.push(...batch);
        if(batch.length<pageSize)break; start+=pageSize;
        if(pages>200)throw new Error('Pagination safety stop reached; source may have changed');
      }
      const now=new Date().toISOString();
      const opportunities:Opportunity[]=all.map((row,i)=>{
        const topics=row.solicitation_topics||[]; const deadline=due(row);
        const item:Opportunity={
          id:`sbir-${encodeURIComponent(row.solicitation_number||String(i))}`,providerId:row.solicitation_number||String(i),source:'SBIR/STTR',sourceKind:'api',sourceTier:'federal',
          title:row.solicitation_title||topics[0]?.topic_title||'Untitled SBIR/STTR solicitation',funder:row.agency||'U.S. SBIR/STTR',subagency:row.branch||'',number:row.solicitation_number||'',
          status:row.current_status||'Open',category:'Research & innovation',categories:['Research & innovation'],topicTags:topics.map(t=>t.topic_title||'').filter(Boolean),
          opportunityType:[row.program,row.phase].filter(Boolean).join(' · ')||'SBIR/STTR solicitation',eligibility:['Small businesses / SBIR-STTR eligible applicants'],
          postedDate:row.release_date||'',openDate:row.open_date||'',deadline,deadlineType:deadline?'fixed':'unknown',geography:'United States',
          url:row.solicitation_agency_url||topics[0]?.sbir_topic_link||'https://www.sbir.gov/topics',
          description:topics.map(t=>t.topic_description).filter(Boolean).join(' ').slice(0,4000)||`Federal ${row.program||'SBIR/STTR'} solicitation${row.phase?` (${row.phase})`:''}.`,
          lastChecked:now,detailAvailable:false
        }; item.dataCompleteness=completeness(item); return item;
      });
      return {provider:'SBIR/STTR',opportunities,total:opportunities.length,coverage:'complete',retrievalMethod:'api',pagesFetched:pages,note:`Exhausted ${pages} public API page${pages===1?'':'s'} for currently open solicitations.`};
    }catch(error){return {provider:'SBIR/STTR',opportunities:[],coverage:'unknown',retrievalMethod:'api',error:String(error),note:'SBIR.gov currently warns that its APIs are undergoing maintenance; OpenFunding will surface source failure rather than fabricate coverage.'}}
  }
};
