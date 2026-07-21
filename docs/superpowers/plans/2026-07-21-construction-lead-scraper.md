# Construction Lead Scraper (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Go CLI (`leadscraper`) that reads a seed CSV of construction companies, crawls each company's own public website, extracts contact info, scores each company as a cold-outreach prospect, and writes a sorted `leads.csv` (plus `errors.csv` for failures).

**Architecture:** A small pipeline of single-purpose Go packages — `seed` (CSV in), `config` (scoring rules in), `crawler` (fetches a fixed set of candidate pages from a company's own domain via `colly`, respecting robots.txt and rate limits), `extractor` (pure HTML/text → structured fields, no network), `scorer` (pure fields → score, no network), `output` (structured rows → CSV out), and `pipeline` (wires it all together with a bounded worker pool). `cmd/leadscraper` is a thin CLI wrapper.

**Tech Stack:** Go 1.22+, `github.com/gocolly/colly/v2` (crawling), `github.com/PuerkitoBio/goquery` (HTML parsing), `gopkg.in/yaml.v3` (config), Go stdlib `encoding/csv` (I/O). No database.

## Global Constraints

- The tool lives at `leadscraper/` inside the existing `foundry-tools` repo, as its own Go module (not a new repo).
- v1 is stateless: CSV in, CSV out. No database, no persistence between runs.
- The crawler only fetches pages from the domain the seed row supplies (the company's own website) — never third-party sites (no LinkedIn, no directories, no search engines).
- The crawler must respect `robots.txt` and rate-limit requests per domain (spec: `docs/superpowers/specs/2026-07-21-construction-lead-scraper-design.md`).
- `extractor` and `scorer` packages must have zero network calls — they operate on already-fetched strings/structs so they're unit-testable without a live network.
- A single company failing to crawl/parse must not abort the run — it is recorded in `errors.csv` and the run continues.

---

## Task 1: Go module scaffold + seed CSV reader

**Files:**
- Create: `leadscraper/go.mod`
- Create: `leadscraper/internal/seed/seed.go`
- Test: `leadscraper/internal/seed/seed_test.go`

**Interfaces:**
- Produces: `seed.Company{Name, Website, City, State string}`, `seed.ReadSeedCSV(path string) ([]Company, error)` — used by every later task that needs the seed list.

- [ ] **Step 1: Scaffold the module**

Run:
```bash
mkdir -p leadscraper/internal/seed
cd leadscraper && go mod init github.com/pelicanfoundry/foundry-tools/leadscraper && cd ..
```
Expected: `leadscraper/go.mod` is created containing `module github.com/pelicanfoundry/foundry-tools/leadscraper` and a `go` directive matching your local toolchain (e.g. `go 1.22`).

- [ ] **Step 2: Write the failing test**

Create `leadscraper/internal/seed/seed_test.go`:

```go
package seed

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func writeTempCSV(t *testing.T, contents string) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "seed.csv")
	if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
		t.Fatalf("writing temp csv: %v", err)
	}
	return path
}

func TestReadSeedCSV_ParsesRows(t *testing.T) {
	path := writeTempCSV(t, "company_name,website,city,state\nAcme Construction,https://acme.example,Tampa,FL\n")

	got, err := ReadSeedCSV(path)
	if err != nil {
		t.Fatalf("ReadSeedCSV() error = %v", err)
	}

	want := []Company{
		{Name: "Acme Construction", Website: "https://acme.example", City: "Tampa", State: "FL"},
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("ReadSeedCSV() = %+v, want %+v", got, want)
	}
}

func TestReadSeedCSV_MissingColumn(t *testing.T) {
	path := writeTempCSV(t, "company_name,city,state\nAcme Construction,Tampa,FL\n")

	_, err := ReadSeedCSV(path)
	if err == nil {
		t.Fatal("expected error for missing website column, got nil")
	}
}

func TestReadSeedCSV_MissingFile(t *testing.T) {
	_, err := ReadSeedCSV("/nonexistent/path/seed.csv")
	if err == nil {
		t.Fatal("expected error for missing file, got nil")
	}
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd leadscraper && go test ./internal/seed/...`
Expected: FAIL — build error, `undefined: Company` / `undefined: ReadSeedCSV` (package doesn't exist yet).

- [ ] **Step 4: Write the implementation**

Create `leadscraper/internal/seed/seed.go`:

```go
package seed

import (
	"encoding/csv"
	"fmt"
	"os"
	"strings"
)

type Company struct {
	Name    string
	Website string
	City    string
	State   string
}

func ReadSeedCSV(path string) ([]Company, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("opening %s: %w", path, err)
	}
	defer f.Close()

	r := csv.NewReader(f)
	records, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("parsing %s: %w", path, err)
	}
	if len(records) == 0 {
		return nil, fmt.Errorf("%s has no rows", path)
	}

	header := records[0]
	idx := map[string]int{}
	for i, col := range header {
		idx[strings.TrimSpace(strings.ToLower(col))] = i
	}
	for _, required := range []string{"company_name", "website", "city", "state"} {
		if _, ok := idx[required]; !ok {
			return nil, fmt.Errorf("%s missing required column %q", path, required)
		}
	}

	var companies []Company
	for _, row := range records[1:] {
		companies = append(companies, Company{
			Name:    row[idx["company_name"]],
			Website: row[idx["website"]],
			City:    row[idx["city"]],
			State:   row[idx["state"]],
		})
	}
	return companies, nil
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd leadscraper && go test ./internal/seed/... -v`
Expected: PASS — all three tests pass.

- [ ] **Step 6: Commit**

```bash
git add leadscraper/go.mod leadscraper/internal/seed
git commit -m "feat(leadscraper): scaffold Go module and seed CSV reader"
```

---

## Task 2: Scoring config loader (YAML)

**Files:**
- Create: `leadscraper/internal/config/config.go`
- Test: `leadscraper/internal/config/config_test.go`

**Interfaces:**
- Produces: `config.ScoringConfig{KeywordWeights map[string]int, StateWeights map[string]int}`, `config.Load(path string) (ScoringConfig, error)` — consumed by the `scorer` package (Task 6) and the CLI (Task 10).

- [ ] **Step 1: Add the YAML dependency**

Run: `cd leadscraper && go get gopkg.in/yaml.v3`
Expected: `go.mod`/`go.sum` updated with `gopkg.in/yaml.v3`.

- [ ] **Step 2: Write the failing test**

Create `leadscraper/internal/config/config_test.go`:

```go
package config

import (
	"os"
	"path/filepath"
	"testing"
)

func writeTempYAML(t *testing.T, contents string) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "scoring.yaml")
	if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
		t.Fatalf("writing temp yaml: %v", err)
	}
	return path
}

func TestLoad_ParsesWeights(t *testing.T) {
	path := writeTempYAML(t, `
keyword_weights:
  quickbooks: 10
  bookkeeper: 10
state_weights:
  FL: 2
`)

	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.KeywordWeights["quickbooks"] != 10 {
		t.Errorf("KeywordWeights[quickbooks] = %d, want 10", cfg.KeywordWeights["quickbooks"])
	}
	if cfg.StateWeights["FL"] != 2 {
		t.Errorf("StateWeights[FL] = %d, want 2", cfg.StateWeights["FL"])
	}
}

func TestLoad_MissingFile(t *testing.T) {
	_, err := Load("/nonexistent/scoring.yaml")
	if err == nil {
		t.Fatal("expected error for missing file, got nil")
	}
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd leadscraper && go test ./internal/config/...`
Expected: FAIL — `undefined: Load` / `undefined: ScoringConfig`.

- [ ] **Step 4: Write the implementation**

Create `leadscraper/internal/config/config.go`:

```go
package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

type ScoringConfig struct {
	KeywordWeights map[string]int `yaml:"keyword_weights"`
	StateWeights   map[string]int `yaml:"state_weights"`
}

func Load(path string) (ScoringConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return ScoringConfig{}, fmt.Errorf("reading %s: %w", path, err)
	}
	var cfg ScoringConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return ScoringConfig{}, fmt.Errorf("parsing %s: %w", path, err)
	}
	return cfg, nil
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd leadscraper && go test ./internal/config/... -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add leadscraper/go.mod leadscraper/go.sum leadscraper/internal/config
git commit -m "feat(leadscraper): add scoring config YAML loader"
```

---

## Task 3: Extractor — phone number extraction

**Files:**
- Create: `leadscraper/internal/extractor/extractor.go`
- Create: `leadscraper/internal/extractor/testdata/about_with_owner.html`
- Create: `leadscraper/internal/extractor/testdata/about_no_contact.html`
- Test: `leadscraper/internal/extractor/extractor_test.go`

**Interfaces:**
- Produces (this task): `extractor.ExtractPhone(text string) string`, private `htmlToText(html string) string`.
- These fixture files are reused by Tasks 4 and 5 — do not rename them.

- [ ] **Step 1: Add the goquery dependency**

Run: `cd leadscraper && go get github.com/PuerkitoBio/goquery`

- [ ] **Step 2: Create fixture HTML files**

Create `leadscraper/internal/extractor/testdata/about_with_owner.html`:

```html
<html><body>
<h1>About Us</h1>
<p>Owner: John Smith</p>
<p>Call us at (555) 123-4567.</p>
</body></html>
```

Create `leadscraper/internal/extractor/testdata/about_no_contact.html`:

```html
<html><body>
<h1>About Us</h1>
<p>We build great things.</p>
</body></html>
```

- [ ] **Step 3: Write the failing test**

Create `leadscraper/internal/extractor/extractor_test.go`:

```go
package extractor

import (
	"os"
	"testing"
)

func readFixture(t *testing.T, name string) string {
	t.Helper()
	data, err := os.ReadFile("testdata/" + name)
	if err != nil {
		t.Fatalf("reading fixture %s: %v", name, err)
	}
	return string(data)
}

func TestExtractPhone_Found(t *testing.T) {
	html := readFixture(t, "about_with_owner.html")
	text := htmlToText(html)
	got := ExtractPhone(text)
	want := "(555) 123-4567"
	if got != want {
		t.Fatalf("ExtractPhone() = %q, want %q", got, want)
	}
}

func TestExtractPhone_NotFound(t *testing.T) {
	html := readFixture(t, "about_no_contact.html")
	text := htmlToText(html)
	got := ExtractPhone(text)
	if got != "" {
		t.Fatalf("ExtractPhone() = %q, want empty", got)
	}
}
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd leadscraper && go test ./internal/extractor/...`
Expected: FAIL — `undefined: htmlToText` / `undefined: ExtractPhone`.

- [ ] **Step 5: Write the implementation**

Create `leadscraper/internal/extractor/extractor.go`:

```go
package extractor

import (
	"regexp"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

var phoneRegex = regexp.MustCompile(`\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}`)

// htmlToText converts HTML into plain text, one line per leaf element
// (an element with no child elements, e.g. a <p> or <h1>). Joining leaf
// text with newlines gives line-oriented extractors (like
// ExtractContactName) a reliable boundary between unrelated page
// fragments, instead of goquery's default no-separator concatenation.
func htmlToText(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	var lines []string
	doc.Find("body *").Each(func(_ int, s *goquery.Selection) {
		if s.Children().Length() > 0 {
			return
		}
		text := strings.TrimSpace(s.Text())
		if text != "" {
			lines = append(lines, text)
		}
	})
	if len(lines) == 0 {
		return strings.TrimSpace(doc.Text())
	}
	return strings.Join(lines, "\n")
}

func ExtractPhone(text string) string {
	return phoneRegex.FindString(text)
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd leadscraper && go test ./internal/extractor/... -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add leadscraper/go.mod leadscraper/go.sum leadscraper/internal/extractor
git commit -m "feat(leadscraper): add HTML-to-text helper and phone extraction"
```

---

## Task 4: Extractor — contact name extraction

**Files:**
- Modify: `leadscraper/internal/extractor/extractor.go`
- Modify: `leadscraper/internal/extractor/extractor_test.go`

**Interfaces:**
- Consumes: `htmlToText` from Task 3.
- Produces: `extractor.ExtractContactName(text string) string`.

- [ ] **Step 1: Add the failing tests**

Append to `leadscraper/internal/extractor/extractor_test.go`:

```go
func TestExtractContactName_Found(t *testing.T) {
	html := readFixture(t, "about_with_owner.html")
	text := htmlToText(html)
	got := ExtractContactName(text)
	want := "John Smith"
	if got != want {
		t.Fatalf("ExtractContactName() = %q, want %q", got, want)
	}
}

func TestExtractContactName_NotFound(t *testing.T) {
	html := readFixture(t, "about_no_contact.html")
	text := htmlToText(html)
	got := ExtractContactName(text)
	if got != "" {
		t.Fatalf("ExtractContactName() = %q, want empty", got)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd leadscraper && go test ./internal/extractor/...`
Expected: FAIL — `undefined: ExtractContactName`.

- [ ] **Step 3: Write the implementation**

Add to `leadscraper/internal/extractor/extractor.go` (below the existing `phoneRegex`/`ExtractPhone`):

```go
var (
	titleLineRegex = regexp.MustCompile(`(?i)^(?:owner|president|ceo|founder|managing partner)\s*:?\s*(.+)$`)
	nameShapeRegex = regexp.MustCompile(`^[A-Z][a-zA-Z'.-]+(?:\s+[A-Z][a-zA-Z'.-]+){1,2}$`)
)

// ExtractContactName looks line-by-line for a "<Title>: <Name>" pattern
// (e.g. "Owner: John Smith") and returns the name if it looks like a
// real 2-3 word capitalized name. Operates on line-oriented text as
// produced by htmlToText, not raw HTML.
func ExtractContactName(text string) string {
	for _, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(line)
		m := titleLineRegex.FindStringSubmatch(line)
		if m == nil {
			continue
		}
		candidate := strings.TrimSpace(m[1])
		if nameShapeRegex.MatchString(candidate) {
			return candidate
		}
	}
	return ""
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd leadscraper && go test ./internal/extractor/... -v`
Expected: PASS — all extractor tests pass.

- [ ] **Step 5: Commit**

```bash
git add leadscraper/internal/extractor
git commit -m "feat(leadscraper): add contact name extraction"
```

---

## Task 5: Extractor — LinkedIn URL detection and the `Extract` combinator

**Files:**
- Modify: `leadscraper/internal/extractor/extractor.go`
- Modify: `leadscraper/internal/extractor/extractor_test.go`
- Create: `leadscraper/internal/extractor/testdata/home_with_linkedin.html`
- Create: `leadscraper/internal/extractor/testdata/careers_with_keywords.html`

**Interfaces:**
- Consumes: `ExtractPhone`, `ExtractContactName`, `htmlToText` from Tasks 3-4.
- Produces: `extractor.Page{Kind, HTML string}`, `extractor.ExtractedFields{Phone, ContactName, LinkedInURL, CareersText string}`, `extractor.ExtractLinkedInURL(html string) string`, `extractor.Extract(pages []Page) ExtractedFields`. `Page` and `ExtractedFields` are consumed by `crawler` (Task 8), `scorer` (Task 6), and `pipeline` (Task 9) — do not change these field names later.

- [ ] **Step 1: Create fixture HTML files**

Create `leadscraper/internal/extractor/testdata/home_with_linkedin.html`:

```html
<html><body>
<footer><a href="https://www.linkedin.com/company/acme-construction">LinkedIn</a></footer>
</body></html>
```

Create `leadscraper/internal/extractor/testdata/careers_with_keywords.html`:

```html
<html><body>
<h1>Careers</h1>
<p>We are hiring a Bookkeeper experienced in QuickBooks.</p>
</body></html>
```

- [ ] **Step 2: Write the failing tests**

Append to `leadscraper/internal/extractor/extractor_test.go` (add `"strings"` to the import block):

```go
func TestExtractLinkedInURL_Found(t *testing.T) {
	html := readFixture(t, "home_with_linkedin.html")
	got := ExtractLinkedInURL(html)
	want := "https://www.linkedin.com/company/acme-construction"
	if got != want {
		t.Fatalf("ExtractLinkedInURL() = %q, want %q", got, want)
	}
}

func TestExtractLinkedInURL_NotFound(t *testing.T) {
	html := readFixture(t, "about_no_contact.html")
	got := ExtractLinkedInURL(html)
	if got != "" {
		t.Fatalf("ExtractLinkedInURL() = %q, want empty", got)
	}
}

func TestExtract_CombinesAcrossPages(t *testing.T) {
	pages := []Page{
		{Kind: "home", HTML: readFixture(t, "home_with_linkedin.html")},
		{Kind: "about", HTML: readFixture(t, "about_with_owner.html")},
		{Kind: "careers", HTML: readFixture(t, "careers_with_keywords.html")},
	}
	fields := Extract(pages)
	if fields.Phone != "(555) 123-4567" {
		t.Errorf("Phone = %q", fields.Phone)
	}
	if fields.ContactName != "John Smith" {
		t.Errorf("ContactName = %q", fields.ContactName)
	}
	if fields.LinkedInURL != "https://www.linkedin.com/company/acme-construction" {
		t.Errorf("LinkedInURL = %q", fields.LinkedInURL)
	}
	if !strings.Contains(fields.CareersText, "Bookkeeper") {
		t.Errorf("CareersText missing expected content: %q", fields.CareersText)
	}
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd leadscraper && go test ./internal/extractor/...`
Expected: FAIL — `undefined: Page` / `undefined: ExtractLinkedInURL` / `undefined: Extract`.

- [ ] **Step 4: Write the implementation**

Add to `leadscraper/internal/extractor/extractor.go`:

```go
var linkedInHrefRegex = regexp.MustCompile(`https?://(www\.)?linkedin\.com/[^\s"']+`)

// ExtractLinkedInURL looks for a linkedin.com URL in raw HTML. Because
// the crawler only ever fetches pages from the company's own domain,
// any linkedin.com link found here is one the company published itself
// (e.g. in a footer) — this never scrapes LinkedIn directly.
func ExtractLinkedInURL(html string) string {
	return linkedInHrefRegex.FindString(html)
}

// Page is one fetched page from a company's own site, labeled with its
// role (e.g. "home", "about", "careers") so Extract knows which page's
// text to use for CareersText.
type Page struct {
	Kind string
	HTML string
}

type ExtractedFields struct {
	Phone       string
	ContactName string
	LinkedInURL string
	CareersText string
}

// Extract combines fields across all crawled pages of one company,
// keeping the first non-empty value found (in page order) for Phone,
// ContactName, and LinkedInURL, and using the "careers" page (if any)
// for CareersText.
func Extract(pages []Page) ExtractedFields {
	var fields ExtractedFields
	for _, p := range pages {
		text := htmlToText(p.HTML)
		if fields.Phone == "" {
			if phone := ExtractPhone(text); phone != "" {
				fields.Phone = phone
			}
		}
		if fields.ContactName == "" {
			if name := ExtractContactName(text); name != "" {
				fields.ContactName = name
			}
		}
		if fields.LinkedInURL == "" {
			if url := ExtractLinkedInURL(p.HTML); url != "" {
				fields.LinkedInURL = url
			}
		}
		if p.Kind == "careers" {
			fields.CareersText = text
		}
	}
	return fields
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd leadscraper && go test ./internal/extractor/... -v`
Expected: PASS — all extractor tests pass.

- [ ] **Step 6: Commit**

```bash
git add leadscraper/internal/extractor
git commit -m "feat(leadscraper): add LinkedIn URL detection and cross-page Extract combinator"
```

---

## Task 6: Scorer

**Files:**
- Create: `leadscraper/internal/scorer/scorer.go`
- Test: `leadscraper/internal/scorer/scorer_test.go`

**Interfaces:**
- Consumes: `extractor.ExtractedFields` (Task 5), `seed.Company` (Task 1), `config.ScoringConfig` (Task 2).
- Produces: `scorer.Result{Score int, MatchedKeywords []string}`, `scorer.Score(fields extractor.ExtractedFields, company seed.Company, cfg config.ScoringConfig) Result` — consumed by `pipeline` (Task 9).

- [ ] **Step 1: Write the failing test**

Create `leadscraper/internal/scorer/scorer_test.go`:

```go
package scorer

import (
	"reflect"
	"testing"

	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/config"
	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/extractor"
	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/seed"
)

func TestScore_KeywordAndStateAndContactWeights(t *testing.T) {
	fields := extractor.ExtractedFields{
		CareersText: "Hiring a Bookkeeper familiar with QuickBooks.",
		ContactName: "Jane Doe",
	}
	company := seed.Company{State: "FL"}
	cfg := config.ScoringConfig{
		KeywordWeights: map[string]int{"quickbooks": 10, "bookkeeper": 10, "sage": 5},
		StateWeights:   map[string]int{"FL": 2},
	}

	got := Score(fields, company, cfg)

	if got.Score != 23 {
		t.Errorf("Score = %d, want 23", got.Score)
	}
	want := []string{"bookkeeper", "quickbooks"}
	if !reflect.DeepEqual(got.MatchedKeywords, want) {
		t.Errorf("MatchedKeywords = %v, want %v", got.MatchedKeywords, want)
	}
}

func TestScore_NoMatches(t *testing.T) {
	fields := extractor.ExtractedFields{CareersText: "General labor needed."}
	company := seed.Company{State: "TX"}
	cfg := config.ScoringConfig{
		KeywordWeights: map[string]int{"quickbooks": 10},
		StateWeights:   map[string]int{"FL": 2},
	}

	got := Score(fields, company, cfg)

	if got.Score != 0 {
		t.Errorf("Score = %d, want 0", got.Score)
	}
	if len(got.MatchedKeywords) != 0 {
		t.Errorf("MatchedKeywords = %v, want empty", got.MatchedKeywords)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd leadscraper && go test ./internal/scorer/...`
Expected: FAIL — package `scorer` / `Score` / `Result` undefined.

- [ ] **Step 3: Write the implementation**

Create `leadscraper/internal/scorer/scorer.go`:

```go
package scorer

import (
	"sort"
	"strings"

	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/config"
	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/extractor"
	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/seed"
)

type Result struct {
	Score           int
	MatchedKeywords []string
}

// Score applies keyword weights (matched against CareersText), a state
// weight, and a small bonus for having found a named contact. It has no
// network calls, so it's testable purely against fixture structs.
func Score(fields extractor.ExtractedFields, company seed.Company, cfg config.ScoringConfig) Result {
	var result Result

	lowerCareers := strings.ToLower(fields.CareersText)
	for keyword, weight := range cfg.KeywordWeights {
		if keyword == "" {
			continue
		}
		if strings.Contains(lowerCareers, strings.ToLower(keyword)) {
			result.Score += weight
			result.MatchedKeywords = append(result.MatchedKeywords, keyword)
		}
	}
	sort.Strings(result.MatchedKeywords)

	if weight, ok := cfg.StateWeights[strings.ToUpper(company.State)]; ok {
		result.Score += weight
	}

	if fields.ContactName != "" {
		result.Score++
	}

	return result
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd leadscraper && go test ./internal/scorer/... -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add leadscraper/internal/scorer
git commit -m "feat(leadscraper): add keyword/state/contact scoring"
```

---

## Task 7: Output writer (leads.csv + errors.csv)

**Files:**
- Create: `leadscraper/internal/output/output.go`
- Test: `leadscraper/internal/output/output_test.go`

**Interfaces:**
- Consumes: `seed.Company` (Task 1).
- Produces: `output.LeadRow{Company seed.Company, Phone, ContactName, LinkedInURL string, Score int, MatchedKeywords []string}`, `output.ErrorRow{Company seed.Company, Reason string}`, `output.WriteLeads(path string, rows []LeadRow) error`, `output.WriteErrors(path string, rows []ErrorRow) error` — consumed by `pipeline` (Task 9) and the CLI (Task 10).

- [ ] **Step 1: Write the failing tests**

Create `leadscraper/internal/output/output_test.go`:

```go
package output

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/seed"
)

func TestWriteLeads_SortsByScoreDescending(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "leads.csv")

	rows := []LeadRow{
		{Company: seed.Company{Name: "Low Score Co"}, Score: 5},
		{Company: seed.Company{Name: "High Score Co"}, Score: 20, MatchedKeywords: []string{"quickbooks"}},
	}

	if err := WriteLeads(path, rows); err != nil {
		t.Fatalf("WriteLeads() error = %v", err)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("reading output: %v", err)
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	if len(lines) != 3 {
		t.Fatalf("expected header + 2 rows, got %d lines: %v", len(lines), lines)
	}
	if !strings.HasPrefix(lines[1], "High Score Co,") {
		t.Errorf("first data row = %q, want High Score Co first", lines[1])
	}
	if !strings.HasPrefix(lines[2], "Low Score Co,") {
		t.Errorf("second data row = %q, want Low Score Co second", lines[2])
	}
}

func TestWriteErrors_WritesReason(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "errors.csv")

	rows := []ErrorRow{
		{Company: seed.Company{Name: "Broken Co"}, Reason: "timeout"},
	}

	if err := WriteErrors(path, rows); err != nil {
		t.Fatalf("WriteErrors() error = %v", err)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("reading output: %v", err)
	}
	if !strings.Contains(string(data), "Broken Co,,,,timeout") {
		t.Errorf("output = %q, missing expected error row", string(data))
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd leadscraper && go test ./internal/output/...`
Expected: FAIL — `undefined: LeadRow` / `ErrorRow` / `WriteLeads` / `WriteErrors`.

- [ ] **Step 3: Write the implementation**

Create `leadscraper/internal/output/output.go`:

```go
package output

import (
	"encoding/csv"
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"

	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/seed"
)

type LeadRow struct {
	Company         seed.Company
	Phone           string
	ContactName     string
	LinkedInURL     string
	Score           int
	MatchedKeywords []string
}

type ErrorRow struct {
	Company seed.Company
	Reason  string
}

// WriteLeads writes rows sorted by Score descending, regardless of the
// order they were passed in, so the output invariant ("sorted by score")
// doesn't depend on callers getting ordering right themselves.
func WriteLeads(path string, rows []LeadRow) error {
	sorted := make([]LeadRow, len(rows))
	copy(sorted, rows)
	sort.SliceStable(sorted, func(i, j int) bool {
		return sorted[i].Score > sorted[j].Score
	})

	f, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("creating %s: %w", path, err)
	}
	defer f.Close()

	w := csv.NewWriter(f)
	defer w.Flush()

	header := []string{"company_name", "website", "city", "state", "phone", "contact_name", "linkedin_url", "score", "matched_keywords"}
	if err := w.Write(header); err != nil {
		return err
	}
	for _, row := range sorted {
		record := []string{
			row.Company.Name,
			row.Company.Website,
			row.Company.City,
			row.Company.State,
			row.Phone,
			row.ContactName,
			row.LinkedInURL,
			strconv.Itoa(row.Score),
			strings.Join(row.MatchedKeywords, ";"),
		}
		if err := w.Write(record); err != nil {
			return err
		}
	}
	return w.Error()
}

func WriteErrors(path string, rows []ErrorRow) error {
	f, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("creating %s: %w", path, err)
	}
	defer f.Close()

	w := csv.NewWriter(f)
	defer w.Flush()

	header := []string{"company_name", "website", "city", "state", "reason"}
	if err := w.Write(header); err != nil {
		return err
	}
	for _, row := range rows {
		record := []string{row.Company.Name, row.Company.Website, row.Company.City, row.Company.State, row.Reason}
		if err := w.Write(record); err != nil {
			return err
		}
	}
	return w.Error()
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd leadscraper && go test ./internal/output/... -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add leadscraper/internal/output
git commit -m "feat(leadscraper): add sorted leads/errors CSV writer"
```

---

## Task 8: Crawler (colly-based site fetch)

**Files:**
- Create: `leadscraper/internal/crawler/crawler.go`
- Test: `leadscraper/internal/crawler/crawler_test.go`

**Interfaces:**
- Produces: `crawler.Page{Kind, URL, HTML string}`, `crawler.Crawl(baseURL string, timeout time.Duration) ([]Page, error)` — consumed by `pipeline` (Task 9). Note: `crawler.Page` is a distinct type from `extractor.Page`; `pipeline` converts between them.

- [ ] **Step 1: Add the colly dependency**

Run: `cd leadscraper && go get github.com/gocolly/colly/v2`

- [ ] **Step 2: Write the failing tests**

Create `leadscraper/internal/crawler/crawler_test.go`:

```go
package crawler

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func newTestSite(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/robots.txt", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "User-agent: *\nAllow: /\n")
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "<html><body><h1>Home</h1></body></html>")
	})
	mux.HandleFunc("/about", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "<html><body><h1>About</h1></body></html>")
	})
	mux.HandleFunc("/contact", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "<html><body><h1>Contact</h1></body></html>")
	})
	mux.HandleFunc("/careers", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "<html><body><h1>Careers</h1></body></html>")
	})
	return httptest.NewServer(mux)
}

func TestCrawl_FetchesKnownSubpages(t *testing.T) {
	srv := newTestSite(t)
	defer srv.Close()

	pages, err := Crawl(srv.URL, 5*time.Second)
	if err != nil {
		t.Fatalf("Crawl() error = %v", err)
	}

	kinds := map[string]bool{}
	for _, p := range pages {
		kinds[p.Kind] = true
	}
	for _, want := range []string{"home", "about", "contact", "careers"} {
		if !kinds[want] {
			t.Errorf("missing page kind %q in %+v", want, pages)
		}
	}
}

func TestCrawl_MissingTeamPageIsNotFatal(t *testing.T) {
	srv := newTestSite(t)
	defer srv.Close()
	// no "/team" handler is registered -> 404, Crawl must still succeed
	// using the other reachable pages.
	pages, err := Crawl(srv.URL, 5*time.Second)
	if err != nil {
		t.Fatalf("Crawl() error = %v", err)
	}
	if len(pages) < 4 {
		t.Fatalf("expected at least 4 pages, got %d: %+v", len(pages), pages)
	}
}

func TestCrawl_InvalidURL(t *testing.T) {
	_, err := Crawl("://not-a-url", 5*time.Second)
	if err == nil {
		t.Fatal("expected error for invalid URL, got nil")
	}
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd leadscraper && go test ./internal/crawler/...`
Expected: FAIL — `undefined: Crawl` / `undefined: Page`.

- [ ] **Step 4: Write the implementation**

Create `leadscraper/internal/crawler/crawler.go`:

```go
package crawler

import (
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/gocolly/colly/v2"
)

// Page is one fetched page from a company's own site.
type Page struct {
	Kind string
	URL  string
	HTML string
}

var candidatePaths = []string{"", "/about", "/contact", "/careers", "/team"}

// Crawl fetches the homepage plus a small fixed set of common subpages
// from baseURL only (never third-party sites). It respects robots.txt
// and rate-limits requests to be polite to the target server. A missing
// subpage (404, etc.) is not fatal; Crawl only errors if baseURL is
// invalid or every single page fails (e.g. the whole domain is
// unreachable).
func Crawl(baseURL string, timeout time.Duration) ([]Page, error) {
	if _, err := url.Parse(baseURL); err != nil {
		return nil, fmt.Errorf("invalid base url %q: %w", baseURL, err)
	}
	if !strings.HasPrefix(baseURL, "http://") && !strings.HasPrefix(baseURL, "https://") {
		return nil, fmt.Errorf("invalid base url %q: missing scheme", baseURL)
	}

	c := colly.NewCollector(
		colly.UserAgent("PelicanFoundryLeadScraper/1.0"),
	)
	c.IgnoreRobotsTxt = false
	c.SetRequestTimeout(timeout)
	_ = c.Limit(&colly.LimitRule{
		DomainGlob:  "*",
		Delay:       1 * time.Second,
		Parallelism: 1,
	})

	var pages []Page
	var lastNetworkErr error

	c.OnResponse(func(r *colly.Response) {
		if r.StatusCode < 200 || r.StatusCode >= 300 {
			return
		}
		pages = append(pages, Page{
			Kind: kindFor(r.Request.URL.Path),
			URL:  r.Request.URL.String(),
			HTML: string(r.Body),
		})
	})
	c.OnError(func(r *colly.Response, err error) {
		// A network-level failure (no response at all) has StatusCode
		// 0; an HTTP error status (404, etc.) for a missing candidate
		// subpage is expected and not fatal.
		if r.StatusCode == 0 {
			lastNetworkErr = err
		}
	})

	for _, p := range candidatePaths {
		target := strings.TrimRight(baseURL, "/") + p
		_ = c.Visit(target)
	}
	c.Wait()

	if len(pages) == 0 {
		if lastNetworkErr != nil {
			return nil, fmt.Errorf("crawling %s: %w", baseURL, lastNetworkErr)
		}
		return nil, fmt.Errorf("no pages fetched from %s", baseURL)
	}
	return pages, nil
}

func kindFor(path string) string {
	switch {
	case strings.Contains(path, "about"):
		return "about"
	case strings.Contains(path, "contact"):
		return "contact"
	case strings.Contains(path, "career"):
		return "careers"
	case strings.Contains(path, "team"):
		return "team"
	default:
		return "home"
	}
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd leadscraper && go test ./internal/crawler/... -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add leadscraper/go.mod leadscraper/go.sum leadscraper/internal/crawler
git commit -m "feat(leadscraper): add robots.txt-respecting site crawler"
```

---

## Task 9: Pipeline orchestration

**Files:**
- Create: `leadscraper/internal/pipeline/pipeline.go`
- Test: `leadscraper/internal/pipeline/pipeline_test.go`

**Interfaces:**
- Consumes: `seed.Company` (Task 1), `config.ScoringConfig` (Task 2), `crawler.Crawl`/`crawler.Page` (Task 8), `extractor.Page`/`extractor.Extract` (Task 5), `scorer.Score` (Task 6), `output.LeadRow`/`output.ErrorRow` (Task 7).
- Produces: `pipeline.Options{Concurrency int, Timeout time.Duration, Config config.ScoringConfig}`, `pipeline.Run(companies []seed.Company, opts Options) ([]output.LeadRow, []output.ErrorRow)` — consumed by the CLI (Task 10).

- [ ] **Step 1: Write the failing test**

Create `leadscraper/internal/pipeline/pipeline_test.go`:

```go
package pipeline

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/config"
	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/seed"
)

func newGoodSite(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/robots.txt", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "User-agent: *\nAllow: /\n")
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "<html><body><h1>Acme Construction</h1></body></html>")
	})
	mux.HandleFunc("/about", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "<html><body><p>Owner: Jane Doe</p><p>Call (555) 987-6543.</p></body></html>")
	})
	mux.HandleFunc("/careers", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "<html><body><p>Hiring a Bookkeeper familiar with QuickBooks.</p></body></html>")
	})
	return httptest.NewServer(mux)
}

func TestRun_ScoresReachableCompanyAndRecordsMissingWebsite(t *testing.T) {
	good := newGoodSite(t)
	defer good.Close()

	companies := []seed.Company{
		{Name: "Acme Construction", Website: good.URL, City: "Tampa", State: "FL"},
		{Name: "No Website Co", Website: "", City: "Miami", State: "FL"},
	}

	cfg := config.ScoringConfig{
		KeywordWeights: map[string]int{"quickbooks": 10, "bookkeeper": 10},
		StateWeights:   map[string]int{"FL": 2},
	}

	leads, errs := Run(companies, Options{
		Concurrency: 2,
		Timeout:     5 * time.Second,
		Config:      cfg,
	})

	if len(leads) != 1 {
		t.Fatalf("expected 1 lead, got %d: %+v", len(leads), leads)
	}
	lead := leads[0]
	if lead.Company.Name != "Acme Construction" {
		t.Errorf("Company.Name = %q", lead.Company.Name)
	}
	if lead.ContactName != "Jane Doe" {
		t.Errorf("ContactName = %q", lead.ContactName)
	}
	if lead.Phone != "(555) 987-6543" {
		t.Errorf("Phone = %q", lead.Phone)
	}
	// quickbooks(10) + bookkeeper(10) + FL state(2) + contact-found bonus(1) = 23
	if lead.Score != 23 {
		t.Errorf("Score = %d, want 23", lead.Score)
	}

	if len(errs) != 1 {
		t.Fatalf("expected 1 error row, got %d: %+v", len(errs), errs)
	}
	if errs[0].Company.Name != "No Website Co" {
		t.Errorf("error row Company.Name = %q", errs[0].Company.Name)
	}
	if errs[0].Reason != "no website provided" {
		t.Errorf("error row Reason = %q", errs[0].Reason)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd leadscraper && go test ./internal/pipeline/...`
Expected: FAIL — `undefined: Run` / `undefined: Options`.

- [ ] **Step 3: Write the implementation**

Create `leadscraper/internal/pipeline/pipeline.go`:

```go
package pipeline

import (
	"sync"
	"time"

	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/config"
	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/crawler"
	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/extractor"
	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/output"
	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/scorer"
	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/seed"
)

type Options struct {
	Concurrency int
	Timeout     time.Duration
	Config      config.ScoringConfig
}

type result struct {
	lead *output.LeadRow
	err  *output.ErrorRow
}

// Run crawls, extracts, and scores each company with a bounded worker
// pool (Options.Concurrency). A single company failing to crawl never
// aborts the run — it is recorded as an ErrorRow instead.
func Run(companies []seed.Company, opts Options) ([]output.LeadRow, []output.ErrorRow) {
	if opts.Concurrency <= 0 {
		opts.Concurrency = 1
	}

	sem := make(chan struct{}, opts.Concurrency)
	results := make(chan result, len(companies))
	var wg sync.WaitGroup

	for _, c := range companies {
		wg.Add(1)
		go func(c seed.Company) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			results <- processCompany(c, opts)
		}(c)
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	var leads []output.LeadRow
	var errs []output.ErrorRow
	for r := range results {
		if r.lead != nil {
			leads = append(leads, *r.lead)
		}
		if r.err != nil {
			errs = append(errs, *r.err)
		}
	}
	return leads, errs
}

func processCompany(c seed.Company, opts Options) result {
	if c.Website == "" {
		return result{err: &output.ErrorRow{Company: c, Reason: "no website provided"}}
	}

	pages, err := crawler.Crawl(c.Website, opts.Timeout)
	if err != nil {
		return result{err: &output.ErrorRow{Company: c, Reason: err.Error()}}
	}

	extractorPages := make([]extractor.Page, len(pages))
	for i, p := range pages {
		extractorPages[i] = extractor.Page{Kind: p.Kind, HTML: p.HTML}
	}
	fields := extractor.Extract(extractorPages)
	scored := scorer.Score(fields, c, opts.Config)

	return result{lead: &output.LeadRow{
		Company:         c,
		Phone:           fields.Phone,
		ContactName:     fields.ContactName,
		LinkedInURL:     fields.LinkedInURL,
		Score:           scored.Score,
		MatchedKeywords: scored.MatchedKeywords,
	}}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd leadscraper && go test ./internal/pipeline/... -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add leadscraper/internal/pipeline
git commit -m "feat(leadscraper): add pipeline orchestration with bounded concurrency"
```

---

## Task 10: CLI entrypoint

**Files:**
- Create: `leadscraper/cmd/leadscraper/main.go`

**Interfaces:**
- Consumes: `seed.ReadSeedCSV` (Task 1), `config.Load` (Task 2), `pipeline.Run`/`pipeline.Options` (Task 9), `output.WriteLeads`/`output.WriteErrors` (Task 7).

- [ ] **Step 1: Write the CLI**

Create `leadscraper/cmd/leadscraper/main.go`:

```go
package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/config"
	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/output"
	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/pipeline"
	"github.com/pelicanfoundry/foundry-tools/leadscraper/internal/seed"
)

func main() {
	seedPath := flag.String("seed", "", "path to seed CSV (company_name,website,city,state)")
	configPath := flag.String("config", "", "path to scoring YAML config")
	outPath := flag.String("out", "leads.csv", "path to write scored leads CSV")
	errPath := flag.String("errors", "errors.csv", "path to write failed-row CSV")
	concurrency := flag.Int("concurrency", 5, "max concurrent site crawls")
	timeout := flag.Duration("timeout", 10*time.Second, "per-site crawl timeout")
	flag.Parse()

	if *seedPath == "" || *configPath == "" {
		fmt.Fprintln(os.Stderr, "usage: leadscraper -seed seed.csv -config scoring.yaml [-out leads.csv] [-errors errors.csv]")
		os.Exit(1)
	}

	companies, err := seed.ReadSeedCSV(*seedPath)
	if err != nil {
		log.Fatalf("reading seed csv: %v", err)
	}

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("loading scoring config: %v", err)
	}

	leads, errs := pipeline.Run(companies, pipeline.Options{
		Concurrency: *concurrency,
		Timeout:     *timeout,
		Config:      cfg,
	})

	if err := output.WriteLeads(*outPath, leads); err != nil {
		log.Fatalf("writing leads csv: %v", err)
	}
	if err := output.WriteErrors(*errPath, errs); err != nil {
		log.Fatalf("writing errors csv: %v", err)
	}

	fmt.Printf("wrote %d leads to %s, %d errors to %s\n", len(leads), *outPath, len(errs), *errPath)
}
```

- [ ] **Step 2: Build the binary**

Run: `cd leadscraper && go build ./...`
Expected: builds with no errors.

- [ ] **Step 3: Manual smoke test against a local fixture site**

This wires real components together end-to-end; the components themselves are already unit-tested (Tasks 1-9), so a manual run is the fastest way to confirm the CLI wiring itself is correct.

Create a scratch seed file (adjust the website to any real, low-traffic site you're comfortable test-crawling, or point it at `http://localhost:8080` and run `python3 -m http.server 8080` from a directory with a test `index.html`/`about.html`/`careers.html`):

```bash
cat > /tmp/leadscraper-seed.csv <<'EOF'
company_name,website,city,state
Example Co,https://example.com,Tampa,FL
EOF

cat > /tmp/leadscraper-scoring.yaml <<'EOF'
keyword_weights:
  quickbooks: 10
  bookkeeper: 10
state_weights:
  FL: 2
EOF

cd leadscraper && go run ./cmd/leadscraper \
  -seed /tmp/leadscraper-seed.csv \
  -config /tmp/leadscraper-scoring.yaml \
  -out /tmp/leads.csv \
  -errors /tmp/errors.csv

cat /tmp/leads.csv /tmp/errors.csv
```

Expected: prints a `wrote N leads..., M errors...` summary, and `/tmp/leads.csv` contains a header row plus one data row for "Example Co" (score will be low since example.com has no matching content — that's expected, it's a wiring smoke test, not a scoring test).

- [ ] **Step 4: Commit**

```bash
git add leadscraper/cmd
git commit -m "feat(leadscraper): add CLI entrypoint"
```

---

## Task 11: Example config/seed files and README

**Files:**
- Create: `leadscraper/examples/seed.example.csv`
- Create: `leadscraper/examples/scoring.example.yaml`
- Create: `leadscraper/README.md`

- [ ] **Step 1: Create the example seed CSV**

Create `leadscraper/examples/seed.example.csv`:

```csv
company_name,website,city,state
Example Construction LLC,https://example.com,Tampa,FL
```

- [ ] **Step 2: Create the example scoring config**

Create `leadscraper/examples/scoring.example.yaml`:

```yaml
keyword_weights:
  quickbooks: 10
  bookkeeper: 10
  sage: 5
  controller: 3
  cfo: 3
state_weights:
  FL: 2
```

- [ ] **Step 3: Write the README**

Create `leadscraper/README.md`:

```markdown
# leadscraper

Turns a seed CSV of construction companies into a scored, prioritized
cold-outreach list. For each company, it crawls the company's own public
website (never third-party sites — no LinkedIn, no directories, no search
engines) to pull out a phone number, a named contact (owner/president/CEO,
if published), and any careers-page text, then scores the company against
a configurable set of keyword and state weights.

Design spec: `../docs/superpowers/specs/2026-07-21-construction-lead-scraper-design.md`

## Usage

```bash
go build ./cmd/leadscraper
./leadscraper \
  -seed examples/seed.example.csv \
  -config examples/scoring.example.yaml \
  -out leads.csv \
  -errors errors.csv
```

Flags:
- `-seed` (required): CSV with header `company_name,website,city,state`.
- `-config` (required): YAML with `keyword_weights` and `state_weights` maps.
- `-out` (default `leads.csv`): scored companies, sorted by score descending.
- `-errors` (default `errors.csv`): companies that failed to crawl/parse, with a reason.
- `-concurrency` (default `5`): max concurrent site crawls.
- `-timeout` (default `10s`): per-site crawl timeout.

## Scope

v1 is intentionally limited to companies you already have in a seed list
(from a state licensing board, directory, or other source you supply) and
to public pages on each company's own domain. It does not do company
*discovery*, LinkedIn/job-board scraping, or persist state between runs —
see the design spec's "Future iterations" section for what's deliberately
deferred.

## Development

```bash
go test ./...
```
```

- [ ] **Step 4: Run the full test suite**

Run: `cd leadscraper && go build ./... && go test ./...`
Expected: build succeeds, all packages' tests PASS.

- [ ] **Step 5: Commit**

```bash
git add leadscraper/examples leadscraper/README.md
git commit -m "docs(leadscraper): add example seed/config files and README"
```
