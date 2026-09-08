'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import FundingCard, { DisplayField, FundingResult } from '@/components/FundingCard';
import ThemeControls from '@/components/ThemeControls';

type SourceStatus={name:string;returned:number;total:number;ok:boolean;error?:string;note?:string};
type StoreStats={count:number;updatedAt:string;path:string};
type FacetKey='source'|'tier'|'status'|'geography'|'category'|'deadline'|'topic'|'population'|'use';

const DEFAULT_FIELDS:DisplayField[]=['award','eligibility','deadline','geography','posted','type','costShare','sourceTier'];
const FIELD_OPTIONS:{key:DisplayField;label:string}[]=[
  {key:'award',label:'Award range'},{key:'eligibility',label:'Eligibility'},{key:'deadline',label:'Deadline'},
  {key:'geography',label:'Geography'},{key:'posted',label:'Posted date'},{key:'type',label:'Funding type'},
  {key:'costShare',label:'Cost sharing'},{key:'expectedAwards',label:'Expected awards'},
  {key:'sourceTier',label:'Funding level'},{key:'completeness',label:'Data completeness'}
];

function dateNum(v?:string){const n=v?Date.parse(v):NaN;return Number.isNaN(n)?Number.MAX_SAFE_INTEGER:n}
function itemCategory(item:FundingResult){return item.categories?.length?item.categories:[item.category].filter(Boolean) as string[]}
function itemTopics(item:FundingResult){return item.topicTags||[]}
function itemPopulations(item:FundingResult){return item.populations||[]}
function itemUses(item:FundingResult){return item.fundingUses||[]}
function deadlineLabel(item:FundingResult){return item.deadlineType==='rolling'?'Rolling':item.deadline?'Has deadline':'Deadline not listed'}
function countValues(values:string[]){return Object.entries(values.reduce<Record<string,number>>((a,v)=>{if(v)a[v]=(a[v]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1]) as [string,number][]}
function toggleValue(list:string[],value:string){return list.includes(value)?list.filter(v=>v!==value):[...list,value]}

export default function Home(){
  const[query,setQuery]=useState('');
  const[density,setDensity]=useState<'comfortable'|'compact'>('comfortable');
  const[results,setResults]=useState<FundingResult[]>([]);
  const[sources,setSources]=useState<SourceStatus[]>([]);
  const[availableSources,setAvailableSources]=useState<string[]>([]);
  const[store,setStore]=useState<StoreStats|null>(null);
  const[reportedTotal,setReportedTotal]=useState(0);
  const[visibleCount,setVisibleCount]=useState(50);
  const[sourceFilters,setSourceFilters]=useState<string[]>([]);
  const[tierFilters,setTierFilters]=useState<string[]>([]);
  const[statusFilters,setStatusFilters]=useState<string[]>([]);
  const[geoFilters,setGeoFilters]=useState<string[]>([]);
  const[deadlineFilters,setDeadlineFilters]=useState<string[]>([]);
  const[categoryFilters,setCategoryFilters]=useState<string[]>([]);
  const[topicFilters,setTopicFilters]=useState<string[]>([]);
  const[populationFilters,setPopulationFilters]=useState<string[]>([]);
  const[useFilters,setUseFilters]=useState<string[]>([]);
  const[sort,setSort]=useState('deadline');
  const[savedOnly,setSavedOnly]=useState(false);
  const[saved,setSaved]=useState<string[]>([]);
  const[fields,setFields]=useState<DisplayField[]>(DEFAULT_FIELDS);
  const[showCustomize,setShowCustomize]=useState(false);
  const[expanded,setExpanded]=useState<Record<string,boolean>>({});
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');

  useEffect(()=>{try{
    const f=localStorage.getItem('openfunding-result-fields');if(f)setFields(JSON.parse(f));
    const s=localStorage.getItem('openfunding-saved');if(s)setSaved(JSON.parse(s));
    const d=localStorage.getItem('openfunding-density');if(d==='compact'||d==='comfortable')setDensity(d)
  }catch{}},[]);
  useEffect(()=>{localStorage.setItem('openfunding-result-fields',JSON.stringify(fields))},[fields]);
  useEffect(()=>{localStorage.setItem('openfunding-saved',JSON.stringify(saved))},[saved]);
  useEffect(()=>{localStorage.setItem('openfunding-density',density)},[density]);

  async function search(term=query){
    setLoading(true);setError('');
    try{
      const res=await fetch(`/api/opportunities?${new URLSearchParams({q:term})}`);
      const data=await res.json(); if(!res.ok)throw new Error(data.error||'Search failed');
      setResults(data.opportunities||[]);setSources(data.sources||[]);setAvailableSources(data.availableSources||[]);setStore(data.store||null);setReportedTotal(data.reportedTotal||0);setVisibleCount(50);
    }catch(e){setError(e instanceof Error?e.message:'Search failed')}finally{setLoading(false)}
  }
  useEffect(()=>{void search('')},[]);

  function selectedMatch(values:string[], selected:string[]){return selected.length===0||selected.some(v=>values.includes(v))}
  function matchesFilters(item:FundingResult,ignore?:FacetKey){
    if(savedOnly&&!saved.includes(item.id))return false;
    if(ignore!=='source'&&!selectedMatch([item.source],sourceFilters))return false;
    if(ignore!=='tier'&&!selectedMatch([item.sourceTier||'Other'],tierFilters))return false;
    if(ignore!=='status'&&!selectedMatch([item.status||'Status not listed'],statusFilters))return false;
    if(ignore!=='geography'&&!selectedMatch([item.geography||'Not listed'],geoFilters))return false;
    if(ignore!=='category'&&!selectedMatch(itemCategory(item),categoryFilters))return false;
    if(ignore!=='topic'&&!selectedMatch(itemTopics(item),topicFilters))return false;
    if(ignore!=='population'&&!selectedMatch(itemPopulations(item),populationFilters))return false;
    if(ignore!=='use'&&!selectedMatch(itemUses(item),useFilters))return false;
    if(ignore!=='deadline'&&!selectedMatch([deadlineLabel(item)],deadlineFilters))return false;
    return true;
  }

  const filtered=useMemo(()=>{
    const rows=results.filter(item=>matchesFilters(item));
    const amount=(x:FundingResult)=>x.amountMax??x.amountMin??x.estimatedAmountMax??x.estimatedAmountMin??-1;
    return [...rows].sort((a,b)=>sort==='newest'?dateNum(b.postedDate)-dateNum(a.postedDate):sort==='award-high'?amount(b)-amount(a):sort==='award-low'?amount(a)-amount(b):dateNum(a.deadline)-dateNum(b.deadline));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[results,savedOnly,saved,sourceFilters,tierFilters,statusFilters,geoFilters,categoryFilters,topicFilters,populationFilters,useFilters,deadlineFilters,sort]);

  const universe=useMemo(()=>({
    source:countValues(results.map(x=>x.source)), tier:countValues(results.map(x=>x.sourceTier||'Other')),
    status:countValues(results.map(x=>x.status||'Status not listed')), geography:countValues(results.map(x=>x.geography||'Not listed')),
    category:countValues(results.flatMap(itemCategory)), topic:countValues(results.flatMap(itemTopics)),
    population:countValues(results.flatMap(itemPopulations)), use:countValues(results.flatMap(itemUses)), deadline:countValues(results.map(deadlineLabel)),
  }),[results]);
  function stableFacet(current:[string,number][],all:[string,number][]) { const m=new Map(current); return all.map(([label])=>[label,m.get(label)||0] as [string,number]); }

  const facets=useMemo(()=>({
    source:countValues(results.filter(x=>matchesFilters(x,'source')).map(x=>x.source)),
    tier:countValues(results.filter(x=>matchesFilters(x,'tier')).map(x=>x.sourceTier||'Other')),
    status:countValues(results.filter(x=>matchesFilters(x,'status')).map(x=>x.status||'Status not listed')),
    geography:countValues(results.filter(x=>matchesFilters(x,'geography')).map(x=>x.geography||'Not listed')),
    category:countValues(results.filter(x=>matchesFilters(x,'category')).flatMap(itemCategory)),
    topic:countValues(results.filter(x=>matchesFilters(x,'topic')).flatMap(itemTopics)),
    population:countValues(results.filter(x=>matchesFilters(x,'population')).flatMap(itemPopulations)),
    use:countValues(results.filter(x=>matchesFilters(x,'use')).flatMap(itemUses)),
    deadline:countValues(results.filter(x=>matchesFilters(x,'deadline')).map(deadlineLabel)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }),[results,savedOnly,saved,sourceFilters,tierFilters,statusFilters,geoFilters,categoryFilters,topicFilters,populationFilters,useFilters,deadlineFilters]);

  useEffect(()=>{setVisibleCount(50)},[results,sourceFilters,tierFilters,statusFilters,geoFilters,deadlineFilters,categoryFilters,topicFilters,populationFilters,useFilters,savedOnly,sort]);

  const healthy=sources.filter(s=>s.ok).length;
  const activeFilterCount=sourceFilters.length+tierFilters.length+statusFilters.length+geoFilters.length+deadlineFilters.length+categoryFilters.length+topicFilters.length+populationFilters.length+useFilters.length+(savedOnly?1:0);
  function onSubmit(e:FormEvent){e.preventDefault();void search()}
  function toggleField(f:DisplayField){setFields(c=>c.includes(f)?c.filter(x=>x!==f):[...c,f])}
  function clearFilters(){setSourceFilters([]);setTierFilters([]);setStatusFilters([]);setGeoFilters([]);setDeadlineFilters([]);setCategoryFilters([]);setTopicFilters([]);setPopulationFilters([]);setUseFilters([]);setSavedOnly(false);setVisibleCount(50)}
  function toggleSave(id:string){setSaved(x=>x.includes(id)?x.filter(v=>v!==id):[...x,id])}
  function facet(title:string,key:FacetKey,values:[string,number][],selected:string[],setter:(v:string[])=>void){
    return <fieldset className="facetGroup"><legend>{title}</legend>
      {values.slice(0,key==='topic'?14:10).map(([label,count])=><label className={`facetCheck ${count===0&&!selected.includes(label)?'isUnavailable':''}`} key={label}><input type="checkbox" checked={selected.includes(label)} disabled={count===0&&!selected.includes(label)} onChange={()=>setter(toggleValue(selected,label))}/><span>{label}</span><b>{count}</b></label>)}
      {values.length===0&&<span className="facetEmpty">No values in current results</span>}
    </fieldset>
  }

  return <main className={`appShell ${density==='compact'?'isCompact':''}`}>
    <a className="skipLink" href="#results">Skip to results</a>
    <section className="hero" aria-labelledby="page-title">
      <nav className="nav" aria-label="Primary"><Link className="brand" href="/">OpenFunding</Link><div className="navRight"><a className="navActive" href="#results">Explore funding</a><button type="button" className="navSave" onClick={()=>setSavedOnly(!savedOnly)} aria-pressed={savedOnly}>♥ Saved {saved.length}</button><a href="#sources">Sources</a><Link href="/about">About</Link><ThemeControls/></div></nav>
      <div className="heroInner"><span className="pill">Free · no login required</span><h1 id="page-title">Find funding without knowing where to look.</h1><p className="lede">Search public funding across disconnected systems, then narrow it by what actually matters to you.</p>
        <form className="searchBox" onSubmit={onSubmit} role="search"><label className="srOnly" htmlFor="funding-search">Search funding opportunities</label><input id="funding-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try: youth mental health, climate, rural, STEM…"/><button type="submit">Search funding</button></form>
        <div className="heroStats" aria-label="OpenFunding summary"><span><strong>{availableSources.length||11}</strong> connected adapters</span><span><strong>{reportedTotal.toLocaleString()}</strong> matches reported by sources</span><span><strong>{store?.count||0}</strong> opportunities remembered locally</span><span><strong>No login</strong> to search or save</span></div>
      </div>
    </section>

    <section className="resultsWrap" id="results" aria-labelledby="results-heading">
      <div className="resultsHeader"><div><span className="eyebrow">Unified results</span><h2 id="results-heading">{loading?'Searching sources…':`${filtered.length} opportunities shown`}</h2><p className="muted" aria-live="polite" aria-atomic="true">{results.length} loaded locally · {reportedTotal.toLocaleString()} reported at connected sources · {activeFilterCount} active filters · {saved.length} saved</p></div>
        <div className="headerActions"><label className="sortControl">Sort<select value={sort} onChange={e=>setSort(e.target.value)}><option value="deadline">Deadline: soonest</option><option value="newest">Newest posted</option><option value="award-high">Award: high to low</option><option value="award-low">Award: low to high</option></select></label>
          <div className="densityToggle" role="group" aria-label="Result density"><button className={density==='comfortable'?'active':''} aria-pressed={density==='comfortable'} onClick={()=>setDensity('comfortable')} type="button">Comfortable</button><button className={density==='compact'?'active':''} aria-pressed={density==='compact'} onClick={()=>setDensity('compact')} type="button">Compact</button></div>
          <button type="button" className="secondaryButton" aria-expanded={showCustomize} aria-controls="customize-results" onClick={()=>setShowCustomize(!showCustomize)}>Customize</button>
        </div>
      </div>

      {showCustomize&&<section className="customizePanel" id="customize-results" aria-labelledby="customize-heading"><div><strong id="customize-heading">Choose what appears on result cards</strong><p className="muted">Changes preview immediately and are saved automatically in this browser.</p></div><div><div className="fieldChecks">{FIELD_OPTIONS.map(o=><label key={o.key}><input type="checkbox" checked={fields.includes(o.key)} onChange={()=>toggleField(o.key)}/> {o.label}</label>)}</div><button type="button" className="customizeDone" onClick={()=>setShowCustomize(false)}>Done</button></div></section>}
      {error&&<div className="error" role="alert">{error}</div>}

      <div className="searchLayout"><aside className="filters" aria-label="Funding filters"><div className="filterTop"><div><strong>Filters</strong>{activeFilterCount>0&&<span className="activeCount">{activeFilterCount}</span>}</div><button type="button" className="clearButton" onClick={clearFilters}>Clear all</button></div>
        <label className="savedFilterCheck"><input type="checkbox" checked={savedOnly} onChange={()=>setSavedOnly(!savedOnly)}/><span>Saved opportunities</span><b>{saved.length}</b></label>
        {facet('Opportunity topic','topic',stableFacet(facets.topic,universe.topic),topicFilters,setTopicFilters)}
        {facet('Population served','population',stableFacet(facets.population,universe.population),populationFilters,setPopulationFilters)}
        {facet('Funding use','use',stableFacet(facets.use,universe.use),useFilters,setUseFilters)}
        {facet('Funding level','tier',stableFacet(facets.tier,universe.tier),tierFilters,setTierFilters)}
        {facet('Source','source',stableFacet(facets.source,universe.source),sourceFilters,setSourceFilters)}
        {facet('Status','status',stableFacet(facets.status,universe.status),statusFilters,setStatusFilters)}
        {facet('Geography','geography',stableFacet(facets.geography,universe.geography),geoFilters,setGeoFilters)}
        {facet('Category','category',stableFacet(facets.category,universe.category),categoryFilters,setCategoryFilters)}
        {facet('Deadline','deadline',stableFacet(facets.deadline,universe.deadline),deadlineFilters,setDeadlineFilters)}
      </aside>
      <div className="resultsColumn" aria-busy={loading}>{!loading&&!error&&filtered.length===0&&<div className="empty">No opportunities match these filters. Try removing one or more filters.</div>}<div className="grid">{filtered.slice(0,visibleCount).map(item=><FundingCard key={item.id} item={item} fields={fields} expanded={!!expanded[item.id]} onToggle={()=>setExpanded(x=>({...x,[item.id]:!x[item.id]}))} saved={saved.includes(item.id)} onSave={()=>toggleSave(item.id)}/>)}</div>{filtered.length>visibleCount&&<button type="button" className="loadMore" onClick={()=>setVisibleCount(v=>v+50)}>Show 50 more <span>({Math.min(visibleCount,filtered.length)} of {filtered.length} shown)</span></button>}</div></div>

      <details className="sourcesPanel compactSources" id="sources"><summary><span><span className="eyebrow">Sources</span><strong id="sources-heading">{healthy}/{sources.length||availableSources.length} responding</strong></span><span className="sourceSummaryMeta">{results.length.toLocaleString()} loaded · {reportedTotal.toLocaleString()} reported <span aria-hidden="true">⌄</span></span></summary><div className="sourceIntro"><p>OpenFunding shows exactly what each adapter loaded. Structured sources are exhausted page-by-page; if a portal prevents complete extraction, that limitation is labeled instead of hidden.</p>{store&&<p>Remembered locally: <strong>{store.count.toLocaleString()}</strong></p>}</div><div className="sourceList">{sources.map(source=><div className="sourceRow" key={source.name}><span className={source.ok?'statusDot ok':'statusDot'} aria-hidden="true"/><div><strong>{source.name}</strong><small>{source.ok?`${source.returned.toLocaleString()} loaded${source.total>source.returned?` · ${source.total.toLocaleString()} reported at source`:''}${source.note?` · ${source.note}`:''}`:`Unavailable · ${source.error||'unknown error'}`}</small></div><span className="srOnly">{source.ok?'Source responding':'Source unavailable'}</span></div>)}</div></details>
    </section>
  </main>
}
