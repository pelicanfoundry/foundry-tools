# Construction Lead Scraper (MVP) — Design

## Purpose

Turn a seed list of construction companies (gathered manually from public
business directories, state licensing databases, etc.) into a prioritized
cold-outreach call list. For each company, crawl its own public website to
extract contact info and score it for fit as a bookkeeping/accounting
(QuickBooks) prospect for Pelican Foundry outreach.

## Scope (v1 / MVP)

In scope:
- Ingest a seed CSV of companies (name, website, city, state).
- Crawl each company's own website only (homepage + a few common
  subpages: `/about`, `/contact`, `/careers`, `/team`).
- Extract: phone number, an owner/CEO/president name (if present on an
  about/team page), a LinkedIn URL (only if the company links to its own
  LinkedIn page from its own site), and raw text from the careers page.
- Score each company via configurable keyword + rule-based weights
  (e.g. "quickbooks", "bookkeeper", "sage", "controller", "cfo" on the
  careers page; state match; presence of a found contact name).
- Output a single `leads.csv` sorted by score, plus an `errors.csv` for
  companies that failed to crawl or parse.

Out of scope (deferred to later iterations):
- Company *discovery* (finding companies from directories/licensing
  boards) — the seed list is supplied by the user.
- LinkedIn company/profile scraping — LinkedIn actively enforces against
  this via ToS and legal action; not worth the risk for a v1 tool.
- Job-board scraping (Indeed, LinkedIn Jobs, etc.) for hiring signals.
- Revenue/employee-count estimation from third-party data sources.
- Persistent storage (database), "last contacted" tracking, CRM
  integration — v1 is stateless, CSV in / CSV out.

## Why this scope

The riskiest and most fragile parts of the original idea are discovery
(scraping directory sites) and LinkedIn enrichment — both are governed by
restrictive terms of service and are the parts most likely to break or
cause legal/reputational risk. Restricting the crawler to "fetch pages
from the domain the company itself publishes" keeps this in normal,
defensible web-scraping territory (crawling public pages, respecting
robots.txt, rate-limited), while still delivering the valuable part: a
prioritized, contact-enriched call list instead of a bare company list.

## Architecture

```
seed.csv (company_name, website, city, state)
        │
        ▼
   [crawl]  — colly fetches homepage + common subpages, respects
        │      robots.txt, per-domain rate limiting
        ▼
  [extract] — goquery + regex: phone number, owner/CEO/president name
        │      patterns, on-site LinkedIn URL, careers page text
        ▼
   [score]  — keyword + rule-based scoring, configurable weights
        ▼
   leads.csv (sorted by score) + errors.csv (failed rows)
```

## Components

- **CLI entrypoint** (`cmd/leadscraper`): reads seed CSV path and config
  path from flags, orchestrates the pipeline, writes output CSVs.
- **crawler** package: wraps `colly` — per-domain rate limit, robots.txt
  respect, timeout, fetches a fixed small set of candidate subpages per
  domain.
- **extractor** package: pure functions over HTML/text → structured
  fields (phone regex, name-pattern regex, LinkedIn URL detection,
  careers text passthrough). No network calls — testable against fixture
  HTML files.
- **scorer** package: pure function taking extracted fields + a config of
  keyword/rule weights → numeric score + list of matched keywords. No
  network calls — testable with plain structs.
- **config**: a simple YAML/JSON file defining scoring rules (keyword →
  weight, state → weight) so rules can be tuned without recompiling.

Each package has a single responsibility, communicates through plain
Go structs (no shared global state), and can be unit tested in isolation
from the network.

## Data flow / CLI usage

```
leadscraper -seed seed.csv -config scoring.yaml -out leads.csv -errors errors.csv
```

1. Read `seed.csv` rows.
2. For each row (concurrently, bounded worker pool, rate-limited per
   domain): crawl → extract → score.
3. Write successfully-scored rows to `leads.csv`, sorted by score
   descending.
4. Write failed rows (with the error reason) to `errors.csv`.

## Error handling

Per-company failures (timeout, 404, no phone found, malformed HTML) must
not abort the run. Each failure is logged to `errors.csv` with the
company name and reason; the pipeline continues to the next company.
Missing extracted fields (e.g. no contact name found) are recorded as
empty/`unknown` in the output rather than treated as failures — a
company with just a phone number is still a usable partial lead.

## Testing

- Unit tests for `extractor` functions against fixture HTML files
  (found name, no name, found phone, malformed HTML, careers page with
  and without keyword hits).
- Unit tests for `scorer` against fixture extracted-field structs and
  scoring configs (verify weights sum correctly, unknown/missing fields
  don't crash scoring).
- No live network calls in tests; `crawler` package is tested via an
  interface/mock, or excluded from the fast unit test suite and run
  separately as an integration smoke test against a local test server.

## Future iterations (not v1)

- Company discovery from state licensing databases / directories.
- SQLite/Postgres persistence: dedup across runs, "last contacted",
  interest level tracking.
- LinkedIn enrichment via a compliant path (e.g. manual entry, or an
  approved API/data provider) rather than direct scraping.
- Job-posting search for hiring signals (QuickBooks/Sage mentions).
- Revenue/employee-count estimation.
