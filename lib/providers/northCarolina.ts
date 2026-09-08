import type { FundingProvider, Opportunity, ProviderResult } from '@/lib/opportunity';
import { cleanHtml, fetchHtml, finish, hash } from './webSource';
const URL='https://www.nc.gov/your-government/all-nc-state-services/grant-opportunities';
export const northCarolinaProvider:FundingProvider={name:'North Carolina Grants',async search(query,limit):Promise<ProviderResult>{try{
 const html=await fetchHtml(URL);const q=query.toLowerCase();const checked=new Date().toISOString();const rows:Opportunity[]=[];
 const table=cleanHtml(html);const chunks=table.split(/(?=Agriculture|Art & Culture|Business|Community|Education|Environment|Health|Housing|Public Safety|Transportation)/i);
 for(const chunk of chunks){const m=chunk.match(/^(.{2,45}?)\s+(.{8,180}?)\s+([A-Z][A-Za-z &]{1,50})\s+(.{25,700})/);if(!m)continue;const category=m[1].trim(),title=m[2].trim(),agency=m[3].trim(),desc=m[4].trim();if(q&&!`${title} ${agency} ${category} ${desc}`.toLowerCase().includes(q))continue;rows.push(finish({id:`nc-${hash(title+agency)}`,providerId:title,source:'North Carolina Grants',sourceKind:'web',sourceTier:'state',title,funder:`North Carolina ${agency}`,status:'Program listing',category,categories:['State',category],eligibility:[],deadlineType:'unknown',geography:'North Carolina',url:URL,description:desc.slice(0,520),lastChecked:checked,detailAvailable:false}));if(rows.length>=limit)break}
 return{provider:'North Carolina Grants',opportunities:rows,total:rows.length,note:'Official statewide grant-program directory; some listings are recurring programs rather than time-limited notices'};
}catch(error){return{provider:'North Carolina Grants',opportunities:[],error:error instanceof Error?error.message:String(error)}}}};
