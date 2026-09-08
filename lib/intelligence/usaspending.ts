export type HistoricalAward = { recipient: string; amount: number; startDate?: string; endDate?: string; agency?: string; awardId?: string };
export type HistoricalSummary = { programNumbers: string[]; awardCount: number; sampleCount: number; medianAward?: number; minAward?: number; maxAward?: number; recentAwards: HistoricalAward[]; source: 'USAspending.gov'; note?: string };

function median(values:number[]){if(!values.length)return undefined;const s=[...values].sort((a,b)=>a-b);const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2}
export async function getFederalAwardHistory(programNumbers:string[]):Promise<HistoricalSummary|null>{
  const nums=[...new Set(programNumbers.filter(Boolean))].slice(0,8);if(!nums.length)return null;
  const now=new Date();const start=new Date(now);start.setFullYear(start.getFullYear()-5);
  try{
    const response=await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subawards:false,limit:100,page:1,filters:{award_type_codes:['02','03','04','05'],program_numbers:nums,time_period:[{start_date:start.toISOString().slice(0,10),end_date:now.toISOString().slice(0,10)}]},fields:['Award ID','Recipient Name','Start Date','End Date','Award Amount','Awarding Agency'],sort:'Award Amount',order:'desc'}),next:{revalidate:21600}});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);const json=await response.json();const raw:Array<Record<string,unknown>>=json?.results||[];
    const awards:HistoricalAward[]=raw.map(r=>({awardId:String(r['Award ID']||''),recipient:String(r['Recipient Name']||'Recipient not listed'),amount:Number(r['Award Amount']||0),startDate:String(r['Start Date']||''),endDate:String(r['End Date']||''),agency:String(r['Awarding Agency']||'')})).filter(x=>Number.isFinite(x.amount)&&x.amount>0);
    const amounts=awards.map(x=>x.amount);return{programNumbers:nums,awardCount:Number(json?.page_metadata?.total||awards.length),sampleCount:awards.length,medianAward:median(amounts),minAward:amounts.length?Math.min(...amounts):undefined,maxAward:amounts.length?Math.max(...amounts):undefined,recentAwards:awards.slice(0,5),source:'USAspending.gov',note:'Historical awards are context only and are not an estimate of the current opportunity unless explicitly labeled as such.'};
  }catch{return null}
}
