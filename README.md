# OpenFunding v0.9

Grant-seeker-first funding discovery prototype.

## What changed in v0.9

- Removed the artificial 175/600-result ceilings. Grants.gov now uses pagination to exhaust the currently available result pages, while the UI renders results progressively for performance.
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

v0.9 moves React from 19.1.1 to the patched 19.1.9 line and Next.js from 15.5.24 to 15.5.25. After install, run `npm.cmd audit` if npm still reports vulnerabilities. Do not blindly use `npm audit fix --force`; review the specific advisory first.

## OpenFunding Intelligence

The initial intelligence engine is deterministic and auditable. `lib/tagging.ts` derives:

- opportunity topics (for example Mental health, Housing, Education)
- populations served (for example Children & youth, Veterans, Rural communities)
- likely funding uses (for example Direct services, Capacity building, Research & evaluation)

Derived tags are marked as OpenFunding Intelligence and never replace the funder's official categories. The schema supports future AI or hybrid enrichment while preserving provenance.

## Coverage philosophy

OpenFunding prefers official/public upstream sources. A connected source may report more records than the current lightweight adapter can safely normalize. Source Health shows that difference explicitly instead of claiming unparsed records were ingested.


## v0.9 ingestion rules

- No product-defined record caps on source ingestion. If an API/dataset paginates, the adapter exhausts all currently available pages.
- UI rendering is paginated separately (50 cards at a time) so completeness does not require rendering thousands of cards at once.
- Source Health distinguishes **loaded** from **reported at source**. A mismatch is treated as a data-quality signal to fix, not a success metric.
- Local persistence no longer truncates the store at 5,000 records.
- PostCSS is overridden to 8.5.28 to resolve the audit advisories present in earlier prototypes.

## Project status

OpenFunding is an early-stage prototype focused on free, accessible, grant-seeker-first funding discovery. Source coverage and normalization are actively expanding; always verify opportunity details with the linked official source before applying.

## Accessibility

OpenFunding is being designed toward Section 508 / WCAG 2.1 AA conformance, including keyboard access, visible focus, reduced-motion support, reflow-friendly layouts, semantic controls, and Light/Dark/High Contrast display modes. Formal conformance testing is still in progress; the project does not yet claim certified conformance.
