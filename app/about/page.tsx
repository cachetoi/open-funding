import Link from 'next/link';
import ThemeControls from '@/components/ThemeControls';

export default function AboutPage(){
  return <main className="aboutShell">
    <nav className="nav aboutNav" aria-label="Primary"><Link className="brand" href="/">OpenFunding</Link><div className="navRight"><Link href="/#results">Explore funding</Link><Link href="/#sources">Sources</Link><span className="navActive">About</span><ThemeControls/></div></nav>
    <article className="aboutPage">
      <span className="pill">Why OpenFunding exists</span>
      <h1>Finding funding should not require knowing where every funder hides it.</h1>
      <p className="aboutLead">OpenFunding started from a simple frustration: grant seekers are expected to search federal databases, state portals, agency pages, foundation sites, procurement systems, newsletters, and feeds separately—often with different terminology and different filters.</p>
      <section><h2>The problem</h2><p>Public and philanthropic funding information is fragmented. A strong opportunity can exist without ever appearing in the database a grant seeker happens to check. The burden of understanding the funding ecosystem is pushed onto the person already trying to fund the work.</p></section>
      <section><h2>The idea</h2><p>OpenFunding is building one grant-seeker-first search layer across those disconnected sources. Opportunities are normalized into consistent fields, linked back to their official source, and made easier to compare with useful filters and quick facts.</p></section>
      <section><h2>What we believe</h2><div className="beliefGrid"><div><strong>Search should be free.</strong><p>You should not need an account or subscription just to discover that public funding exists.</p></div><div><strong>Sources should stay visible.</strong><p>OpenFunding should help interpret fragmented information without obscuring where it came from.</p></div><div><strong>Missing data should stay missing.</strong><p>We will distinguish official values, historical context, and estimates instead of presenting guesses as facts.</p></div><div><strong>Accessibility is infrastructure.</strong><p>The product is being designed around Section 508 and WCAG-oriented interaction patterns from the beginning.</p></div></div></section>
      <section><h2>Where this can go</h2><p>Beyond live opportunities, OpenFunding can connect historical federal awards, state award data, and IRS 990/990-PF giving history so grant seekers can understand not only what is open, but what similar funding has looked like before.</p></section><section><h2>OpenFunding Intelligence</h2><p>Different funders describe the same work in different ways. OpenFunding adds transparent discovery tags for topics, populations served, and funding uses while preserving the funder’s official categories. AI-assisted enrichment can be layered on later, but derived information will always be labeled separately from official source data.</p></section>
      <div className="aboutCta"><Link className="buttonLink" href="/#results">Explore funding</Link><span>No login required.</span></div>
    </article>
  </main>
}
