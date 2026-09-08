# OpenFunding v0.10

Grant-seeker-first funding discovery prototype.

## What changed in v0.10

- Removed the artificial 175-result ceiling. Grants.gov now uses pagination and reports the full matching hit count while OpenFunding loads up to 600 normalized records per search for the local prototype.
- Progressive rendering: the browser filters the loaded result set but initially renders 50 cards, with an accessible “Show 50 more” control for performance.
- Source health now distinguishes **records loaded** from **records reported at the source** when those numbers differ.
- Added three official state adapters: Minnesota Grants, Texas eGrants, and North Carolina Grants. OpenFunding now has 11 adapters total.
- California source health reads the portal's current-opportunity total separately from the lightweight records currently parsed from its homepage. Structured California dataset ingestion remains a priority.
- Filter choices no longer disappear as other filters change. The vocabulary stays stable; options with no matches show `0` and are disabled.
- Added OpenFunding Intelligence v1: transparent derived tags for topic, population served, and funding use. These are visibly separated from official funder metadata.
- Added Population served and Funding use multi-select filters.
- Added Light, Dark, and High Contrast color modes. The selected mode is saved locally in the browser.
- High Contrast mode uses hard borders, high-visibility focus indicators, and avoids depending on subtle color differences.
- Fixed duplicated topic chips on result cards.
- Updated dependencies to Next.js 15.5.25 and React/React DOM 19.1.9.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open the `Local:` URL printed by Next.js. It may be 3001, 3002, etc. if other local apps already use lower ports.

## Security

Do not commit `.env` files or credentials. `.gitignore` excludes local environment files and the local OpenFunding persistence data.

v0.10 moves React from 19.1.1 to the patched 19.1.9 line and Next.js from 15.5.24 to 15.5.25. After install, run `npm.cmd audit` if npm still reports vulnerabilities. Do not blindly use `npm audit fix --force`; review the specific advisory first.

## OpenFunding Intelligence

The initial intelligence engine is deterministic and auditable. `lib/tagging.ts` derives:

- opportunity topics (for example Mental health, Housing, Education)
- populations served (for example Children & youth, Veterans, Rural communities)
- likely funding uses (for example Direct services, Capacity building, Research & evaluation)

Derived tags are marked as OpenFunding Intelligence and never replace the funder's official categories. The schema supports future AI or hybrid enrichment while preserving provenance.

## Coverage philosophy

OpenFunding prefers official/public upstream sources. A connected source may report more records than the current lightweight adapter can safely normalize. Source Health shows that difference explicitly instead of claiming unparsed records were ingested.


## v0.10 ingestion rules

- No product-defined record caps on source ingestion. If an API/dataset paginates, the adapter exhausts all currently available pages.
- UI rendering is paginated separately (50 cards at a time) so completeness does not require rendering thousands of cards at once.
- Source Health distinguishes **loaded** from **reported at source**. A mismatch is treated as a data-quality signal to fix, not a success metric.
- Local persistence no longer truncates the store at 5,000 records.
- PostCSS is overridden to 8.5.28 to resolve the audit advisories present in earlier prototypes.


## v0.10 coverage expansion — phase 1

- Adds an SBIR/STTR provider that exhausts the documented offset-paginated open-solicitation API instead of imposing a product record cap.
- Adds provider coverage metadata (`complete`, `partial`, `unknown`), retrieval method, and pages fetched so source-health reporting can distinguish full ingestion from best-effort parsing.
- Keeps Grants.gov as a fully paginated source and records pages fetched.
- Prepares `SAM_GOV_API_KEY` as an optional environment variable for a separate **Programs** layer. Assistance Listings are program descriptions, not open opportunities, so they will not be mixed into the opportunity count.
- USAspending remains historical award context rather than an active-opportunity source.

### Coverage roadmap

The next adapters prioritize structured official sources: California's full dataset, New York and Washington structured endpoints where available, then systematic 50-state + DC coverage. Source count and opportunity count are never inflated with duplicate agency copies; duplicate official records should merge into one opportunity with provenance.


## v0.10.1 expanded coverage pass

This pass adds nine official public connectors in one release: Virginia statewide grants, Michigan Education, Michigan DNR, New Jersey Education, New Jersey Human Services NOFAs, Arizona GOYFF, Connecticut DEMHS, Wisconsin DCF, and Georgia OPB. Together with the existing federal/state connectors this brings the configured connector registry to 21.

These new HTML-backed connectors are intentionally labeled `partial` in Source Health. OpenFunding does not claim that a single public webpage is a complete state inventory. Structured APIs/datasets remain preferred and will replace HTML adapters as they are identified. Duplicate federal opportunities should continue to be deduplicated rather than counted as extra grants merely because an agency republishes a Grants.gov notice.

## v0.11 persistent index

OpenFunding can now use Postgres as its durable production index instead of depending on Vercel's ephemeral filesystem or fetching every upstream source for every visitor.

- `DATABASE_URL` enables the persistent index. Neon through the Vercel Marketplace is the recommended zero-cost starting point.
- `/api/sync` performs a full source ingestion and upserts normalized opportunities plus source-health metadata.
- `CRON_SECRET` protects the sync route. Never commit the real secret.
- `vercel.json` schedules one daily ingestion at 04:17 UTC, compatible with Vercel Hobby's daily cron restriction. Higher-frequency refreshes can be enabled later on a plan that supports them.
- User searches read the normalized Postgres index, so upstream outages do not make ordinary searches fail.
- If no database is configured (for example, a fresh local checkout), search falls back to live adapters so development remains usable.
- A source that fails during sync does not wipe its previously indexed records. Records are retired only after a successful non-empty refresh for that source.

### Production setup

1. In Vercel, add a Neon Postgres database to the OpenFunding project from the Marketplace/Storage area.
2. Confirm the integration created `DATABASE_URL` for Production.
3. Add a strong random `CRON_SECRET` in Vercel Environment Variables.
4. Redeploy.
5. Trigger `/api/sync` once with the matching Bearer secret (or wait for the first scheduled run). The route creates its tables automatically.
6. After the first successful sync, the homepage reports durable **opportunities indexed** instead of a local-file count.

The database stores only public funding records and source-health metadata. API keys and database credentials remain server-side environment variables.
