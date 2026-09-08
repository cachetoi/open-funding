import type { FundingProvider, Opportunity, ProviderResult } from '@/lib/opportunity';
import { cleanHtml, fetchHtml, finish, hash, normalizeDate } from './webSource';

const URL='https://esupplier.sfs.ny.gov/psc/fscm/SUPPLIER/ERP/c/NY_SUPPUB_FL.AUC_RESP_INQ_AUC.GBL';

export const newYorkProvider:FundingProvider={
  name:'New York SFS',
  async search(query:string,limit:number):Promise<ProviderResult>{
    try{
      const html=await fetchHtml(URL); const text=cleanHtml(html); const q=query.toLowerCase(); const checked=new Date().toISOString(); const rows:Opportunity[]=[];
      // The public SFS response page renders search rows as text. Capture rows with event id, agency, status/eligibility and due date.
      const rowPattern=/\b([A-Z][A-Z0-9-]{3,24})\s+([A-Z]{3}\d{2})\s+(.{10,180}?)\s+(Available|Advertised Only - Not in SFS|Anticipated|Closed)\s+(.{3,120}?)\s+(\d{2}\/\d{2}\/\d{2,4})[^\d]+(?:\d{2}\/\d{2}\/\d{2,4})[^\d]+(\d{2}\/\d{2}\/\d{4})/g;
      for(const m of text.matchAll(rowPattern)){
        const eventId=m[1],agency=m[2],title=m[3].trim(),status=m[4],elig=m[5].trim(),posted=normalizeDate(m[6]),deadline=normalizeDate(m[7]);
        if(q&&!`${title} ${agency} ${elig}`.toLowerCase().includes(q))continue;
        rows.push(finish({id:`ny-${hash(eventId)}`,providerId:eventId,source:'New York SFS',sourceKind:'web',sourceTier:'state',title,funder:`New York State agency ${agency}`,agencyCode:agency,number:eventId,status,category:'State',categories:['State'],eligibility:elig.split(/,\s*/).filter(Boolean),postedDate:posted,deadline,deadlineType:deadline?'fixed':'unknown',geography:'New York',url:URL,description:`New York State grant opportunity ${eventId} listed in the public Statewide Financial System.`,lastChecked:checked,detailAvailable:false}));
        if(rows.length>=limit)break;
      }
      return {provider:'New York SFS',opportunities:rows,total:rows.length,note:rows.length?'Official public Statewide Financial System grant search':'Official SFS portal connected; no parseable result rows were returned.'};
    }catch(error){return{provider:'New York SFS',opportunities:[],error:error instanceof Error?error.message:String(error)}}
  }
};
