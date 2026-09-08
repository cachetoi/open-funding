import { neon } from '@neondatabase/serverless';
import type { Opportunity, ProviderResult } from './opportunity';
import { searchableText } from './opportunity';

export type IndexStats = { count:number; updatedAt:string; backend:'postgres'|'live-fallback'; path?:string };

type DbRow = { data: Opportunity };
type SourceRow = { name:string; returned:number; total:number; ok:boolean; error?:string|null; note?:string|null; coverage?:'complete'|'partial'|'unknown'; retrieval_method?:string|null; pages_fetched?:number|null; checked_at:string };

function connection(){ return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null; }

export function databaseConfigured(){ return Boolean(process.env.DATABASE_URL); }

export async function ensureSchema(){
  const sql=connection(); if(!sql)return false;
  await sql`CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    deadline TEXT,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    data JSONB NOT NULL
  )`;
  await sql`CREATE INDEX IF NOT EXISTS opportunities_source_idx ON opportunities(source)`;
  await sql`CREATE INDEX IF NOT EXISTS opportunities_active_idx ON opportunities(active)`;
  await sql`CREATE TABLE IF NOT EXISTS source_status (
    name TEXT PRIMARY KEY,
    returned INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    ok BOOLEAN NOT NULL DEFAULT FALSE,
    error TEXT,
    note TEXT,
    coverage TEXT NOT NULL DEFAULT 'unknown',
    retrieval_method TEXT,
    pages_fetched INTEGER,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS sync_runs (
    id BIGSERIAL PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    opportunity_count INTEGER NOT NULL DEFAULT 0,
    source_count INTEGER NOT NULL DEFAULT 0,
    healthy_sources INTEGER NOT NULL DEFAULT 0
  )`;
  return true;
}

export async function persistSync(results:ProviderResult[]){
  const sql=connection(); if(!sql)throw new Error('DATABASE_URL is not configured');
  await ensureSchema();
  const started=new Date().toISOString();
  const all=results.flatMap(r=>r.opportunities);
  for(const item of all){
    const payload={...item,firstSeen:item.firstSeen||started,lastSeen:started};
    await sql`INSERT INTO opportunities(id,source,title,deadline,first_seen,last_seen,active,data)
      VALUES(${item.id},${item.source},${item.title},${item.deadline||null},${payload.firstSeen},${started},TRUE,${JSON.stringify(payload)}::jsonb)
      ON CONFLICT(id) DO UPDATE SET source=EXCLUDED.source,title=EXCLUDED.title,deadline=EXCLUDED.deadline,last_seen=EXCLUDED.last_seen,active=TRUE,data=EXCLUDED.data`;
  }
  for(const r of results){
    await sql`INSERT INTO source_status(name,returned,total,ok,error,note,coverage,retrieval_method,pages_fetched,checked_at)
      VALUES(${r.provider},${r.opportunities.length},${r.total??r.opportunities.length},${!r.error},${r.error||null},${r.note||null},${r.coverage||'unknown'},${r.retrievalMethod||null},${r.pagesFetched??null},NOW())
      ON CONFLICT(name) DO UPDATE SET returned=EXCLUDED.returned,total=EXCLUDED.total,ok=EXCLUDED.ok,error=EXCLUDED.error,note=EXCLUDED.note,coverage=EXCLUDED.coverage,retrieval_method=EXCLUDED.retrieval_method,pages_fetched=EXCLUDED.pages_fetched,checked_at=NOW()`;
  }
  // Only retire records from a source when that source responded successfully in this run.
  for(const r of results.filter(x=>!x.error)){
    const ids=r.opportunities.map(x=>x.id);
    if(ids.length===0) continue; // zero can mean an upstream/parser change; do not erase a whole source automatically
    await sql`UPDATE opportunities SET active=FALSE WHERE source=${r.provider} AND NOT (id = ANY(${ids}))`;
  }
  const healthy=results.filter(r=>!r.error).length;
  await sql`INSERT INTO sync_runs(started_at,finished_at,opportunity_count,source_count,healthy_sources) VALUES(${started},NOW(),${all.length},${results.length},${healthy})`;
  return {count:all.length,sources:results.length,healthy,updatedAt:new Date().toISOString()};
}

export async function searchIndexed(query:string){
  const sql=connection(); if(!sql)return null;
  await ensureSchema();
  const rows=await sql`SELECT data FROM opportunities WHERE active=TRUE ORDER BY deadline NULLS LAST, last_seen DESC` as unknown as DbRow[];
  const items=rows.map(r=>r.data);
  const q=query.trim().toLowerCase();
  return q?items.filter(x=>searchableText(x).includes(q)):items;
}

export async function indexedStats():Promise<IndexStats|null>{
  const sql=connection(); if(!sql)return null;
  await ensureSchema();
  const rows=await sql`SELECT COUNT(*)::int AS count, COALESCE(MAX(last_seen),TO_TIMESTAMP(0))::text AS updated_at FROM opportunities WHERE active=TRUE` as unknown as {count:number;updated_at:string}[];
  return {count:Number(rows[0]?.count||0),updatedAt:rows[0]?.updated_at||new Date(0).toISOString(),backend:'postgres'};
}

export async function indexedSourceStatus(){
  const sql=connection(); if(!sql)return null;
  await ensureSchema();
  const rows=await sql`SELECT name,returned,total,ok,error,note,coverage,retrieval_method,pages_fetched,checked_at::text FROM source_status ORDER BY name` as unknown as SourceRow[];
  return rows.map(r=>({name:r.name,returned:r.returned,total:r.total,ok:r.ok,error:r.error||undefined,note:r.note||undefined,coverage:r.coverage||'unknown',retrievalMethod:r.retrieval_method||undefined,pagesFetched:r.pages_fetched??undefined,lastChecked:r.checked_at}));
}
