# Green Book Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a self-contained Agent Skill that bundles the complete UK Green Book on immunisation, with a Bun-based scrape/package pipeline and GitHub Actions for auto-updates and releases.

**Architecture:** Scraper fetches the gov.uk collection page, discovers chapter URLs, downloads each chapter's HTML, converts to clean markdown with YAML frontmatter. Packager assembles SKILL.md + chapters into a zip. GitHub Actions automate update detection and release publishing.

**Tech Stack:** Bun (latest via mise), TypeScript, turndown (HTML→markdown), archiver or Bun's zip APIs, GitHub Actions

---

### Task 1: Project scaffolding

**Files:**
- Create: `mise.toml`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `VERSION`
- Create: `.gitignore`

**Step 1: Create mise.toml**

```toml
[tools]
bun = "latest"

[tasks.bundle]
description = "Install dependencies"
run = "bun install"

[tasks.scrape]
description = "Scrape Green Book chapters from gov.uk"
depends = ["bundle"]
run = "bun run src/scrape.ts"

[tasks.package]
description = "Package skill into distributable zip"
depends = ["bundle"]
run = "bun run src/package.ts"

[tasks.release]
description = "Scrape, package, and update VERSION"
run = "mise scrape && mise package"

[tasks.typecheck]
description = "Run TypeScript type checker"
run = "bun run typecheck"

[tasks.test]
description = "Run tests"
raw = true
run = "bun test"

[tasks.ci]
description = "Run all checks"
run = "mise typecheck ::: test"
```

**Step 2: Create package.json**

```json
{
  "name": "ukhsa-green-book-skill",
  "version": "0.0.0",
  "module": "src/scrape.ts",
  "type": "module",
  "private": true,
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5"
  },
  "dependencies": {
    "turndown": "^7.2.0",
    "@joplin/turndown-plugin-gfm": "^1.0.56"
  }
}
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "Preserve",
    "moduleDetection": "force",
    "allowJs": true,
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "baseUrl": "./src",
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

**Step 4: Create VERSION**

```
0.0.0
```

**Step 5: Create .gitignore**

```
node_modules/
*.zip
dist/
```

**Step 6: Run bun install**

Run: `mise bundle`
Expected: Dependencies installed, bun.lock created

**Step 7: Verify typecheck**

Run: `mise typecheck`
Expected: No errors (no source files yet, should pass cleanly)

**Step 8: Commit**

```
chore: Scaffold project with mise and bun

Sets up mise.toml with task definitions, package.json
with turndown dependency, and tsconfig.json following
conventions from sibling projects.
```

---

### Task 2: Chapter discovery and scraping

**Files:**
- Create: `src/scrape.ts`
- Create: `src/convert.ts`
- Create: `src/scrape.test.ts`
- Create: `src/convert.test.ts`

**Step 1: Write failing test for chapter URL discovery**

Create `src/scrape.test.ts`:

```typescript
import { describe, expect, test } from "bun:test"
import { discoverChapters } from "./scrape"

describe("discoverChapters", () => {
  test("parses chapter links from collection page HTML", () => {
    const html = `
      <div class="group-title">The Green Book - front cover and contents page</div>
      <li class="gem-c-document-list__item">
        <a href="/government/publications/immunity-and-how-vaccines-work-the-green-book-chapter-1"
           class="gem-c-document-list__item-title">Immunity and how vaccines work: the green book, chapter 1</a>
      </li>
      <li class="gem-c-document-list__item">
        <a href="/government/publications/consent-the-green-book-chapter-2"
           class="gem-c-document-list__item-title">Consent: the green book, chapter 2</a>
      </li>
    `
    const chapters = discoverChapters(html)
    expect(chapters).toHaveLength(2)
    expect(chapters[0]).toEqual({
      title: "Immunity and how vaccines work: the green book, chapter 1",
      path: "/government/publications/immunity-and-how-vaccines-work-the-green-book-chapter-1",
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `mise test`
Expected: FAIL — `discoverChapters` not defined

**Step 3: Write failing test for HTML→markdown conversion**

Create `src/convert.test.ts`:

```typescript
import { describe, expect, test } from "bun:test"
import { convertChapterHtml } from "./convert"

describe("convertChapterHtml", () => {
  test("converts chapter HTML to markdown with frontmatter", () => {
    const html = `
      <div class="gem-c-title">
        <h1>Immunity and how vaccines work</h1>
      </div>
      <div class="gem-c-metadata">
        <dd>1 January 2025</dd>
      </div>
      <div class="govspeak">
        <h2>Introduction</h2>
        <p>Vaccines work by stimulating the immune system.</p>
        <table>
          <tr><th>Type</th><th>Example</th></tr>
          <tr><td>Live</td><td>MMR</td></tr>
        </table>
      </div>
    `
    const result = convertChapterHtml(html, {
      title: "Immunity and how vaccines work: the green book, chapter 1",
      path: "/government/publications/immunity-and-how-vaccines-work-the-green-book-chapter-1",
    })
    expect(result).toContain("---")
    expect(result).toContain("title: ")
    expect(result).toContain("## Introduction")
    expect(result).toContain("Vaccines work by stimulating the immune system.")
  })
})
```

**Step 4: Run test to verify it fails**

Run: `mise test`
Expected: FAIL — `convertChapterHtml` not defined

**Step 5: Implement discoverChapters in src/scrape.ts**

```typescript
export interface ChapterInfo {
  title: string
  path: string
}

export function discoverChapters(html: string): ChapterInfo[] {
  const chapters: ChapterInfo[] = []
  const linkRegex = /<a[^>]+href="(\/government\/publications\/[^"]*green-book[^"]*)"[^>]*class="[^"]*document-list[^"]*item-title[^"]*"[^>]*>([^<]+)<\/a>/gi
  let match
  while ((match = linkRegex.exec(html)) !== null) {
    chapters.push({
      path: match[1]!,
      title: match[2]!.trim(),
    })
  }
  return chapters
}
```

Note: The regex above is a starting point. The actual gov.uk HTML structure will need to be verified during implementation by fetching the real page. Adjust selectors as needed — consider using a proper HTML parser if the regex approach proves brittle.

**Step 6: Implement convertChapterHtml in src/convert.ts**

```typescript
import TurndownService from "turndown"
import type { ChapterInfo } from "./scrape"

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
})

export function convertChapterHtml(html: string, chapter: ChapterInfo): string {
  const dateMatch = html.match(/<dd[^>]*>(\d{1,2}\s+\w+\s+\d{4})<\/dd>/)
  const lastUpdated = dateMatch ? dateMatch[1]!.trim() : "Unknown"

  const govspeakMatch = html.match(/<div[^>]*class="[^"]*govspeak[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/)
  const content = govspeakMatch ? govspeakMatch[1]! : html

  const markdown = turndown.turndown(content)
  const sourceUrl = `https://www.gov.uk${chapter.path}`

  const frontmatter = [
    "---",
    `title: "${chapter.title}"`,
    `source: "${sourceUrl}"`,
    `last_updated: "${lastUpdated}"`,
    "---",
    "",
  ].join("\n")

  return frontmatter + markdown + "\n"
}
```

Note: The govspeak div extraction regex is approximate. Verify against real gov.uk chapter HTML and adjust. May need to handle nested divs or use a DOM parser.

**Step 7: Run tests**

Run: `mise test`
Expected: PASS

**Step 8: Commit**

```
feat: Add chapter discovery and conversion

Scraper discovers chapter URLs from the gov.uk
collection page. Converter transforms chapter HTML
to clean markdown with YAML frontmatter using
turndown.
```

---

### Task 3: Full scrape pipeline

**Files:**
- Modify: `src/scrape.ts`

**Step 1: Add main scrape function**

Add to `src/scrape.ts` the orchestration logic:

```typescript
import { mkdir, writeFile } from "fs/promises"
import { join } from "path"
import { convertChapterHtml } from "./convert"

const COLLECTION_URL = "https://www.gov.uk/government/collections/immunisation-against-infectious-disease-the-green-book"
const CHAPTERS_DIR = join(import.meta.dir, "..", "chapters")

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.text()
}

function chapterFilename(chapter: ChapterInfo): string {
  const slug = chapter.path.split("/").pop()!
  return slug.replace(/-the-green-book/, "") + ".md"
}

async function scrapeAll() {
  const collectionHtml = await fetchPage(COLLECTION_URL)
  const chapters = discoverChapters(collectionHtml)
  console.log(`Found ${chapters.length} chapters`)

  await mkdir(CHAPTERS_DIR, { recursive: true })

  for (const chapter of chapters) {
    const url = `https://www.gov.uk${chapter.path}`
    console.log(`Fetching: ${chapter.title}`)
    const html = await fetchPage(url)
    const markdown = convertChapterHtml(html, chapter)
    const filename = chapterFilename(chapter)
    await writeFile(join(CHAPTERS_DIR, filename), markdown)
  }

  console.log(`Scraped ${chapters.length} chapters to ${CHAPTERS_DIR}`)
}

if (import.meta.main) {
  await scrapeAll()
}
```

Note: The gov.uk chapter pages are publications that may contain multiple documents or have a different HTML structure than expected. During implementation, fetch one chapter first and inspect the actual HTML to verify the content extraction approach works. Each publication page may link to an HTML attachment page — you may need to follow a second link to get the actual chapter content.

**Step 2: Test the scraper against the real site**

Run: `mise scrape`
Expected: Chapters written to `chapters/` directory. Inspect a few files to verify frontmatter and content quality.

**Step 3: Iterate on conversion quality**

Manually inspect 3-4 chapter files covering different content types (tables, lists, headings). Fix any conversion issues in `src/convert.ts`. This is an iterative step — the exact fixes depend on what the real HTML looks like.

**Step 4: Commit**

```
feat: Add full scrape pipeline

Orchestrates fetching the collection page,
discovering chapters, downloading each one, and
writing converted markdown to chapters/.
```

---

### Task 4: SKILL.md generation

**Files:**
- Create: `src/skill.ts`
- Create: `src/skill.test.ts`

**Step 1: Write failing test for SKILL.md generation**

Create `src/skill.test.ts`:

```typescript
import { describe, expect, test } from "bun:test"
import { generateSkillMd } from "./skill"

describe("generateSkillMd", () => {
  test("generates SKILL.md with chapter index", () => {
    const chapters = [
      { filename: "chapter-1.md", title: "Immunity and how vaccines work: the green book, chapter 1", lastUpdated: "1 January 2025" },
      { filename: "chapter-2.md", title: "Consent: the green book, chapter 2", lastUpdated: "15 March 2024" },
    ]
    const result = generateSkillMd(chapters, "2026.03.04")
    expect(result).toContain("UK Green Book on Immunisation")
    expect(result).toContain("| Chapter | Last Updated |")
    expect(result).toContain("chapter-1.md")
    expect(result).toContain("2026.03.04")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `mise test`
Expected: FAIL

**Step 3: Implement generateSkillMd**

Create `src/skill.ts`:

```typescript
interface ChapterEntry {
  filename: string
  title: string
  lastUpdated: string
}

export function generateSkillMd(chapters: ChapterEntry[], version: string): string {
  const rows = chapters
    .map((ch) => `| [${ch.title}](chapters/${ch.filename}) | ${ch.lastUpdated} |`)
    .join("\n")

  return `# UK Green Book on Immunisation

This skill provides the complete UK Green Book (Immunisation Against Infectious Disease) published by UKHSA as reference material.

When answering immunisation questions, consult the relevant chapter files below. Clearly distinguish between Green Book guidance and general medical knowledge.

**Content snapshot:** ${version}. Always check [gov.uk](https://www.gov.uk/government/collections/immunisation-against-infectious-disease-the-green-book) for the latest version. This does not replace clinical judgement.

## Chapters

| Chapter | Last Updated |
|---------|-------------|
${rows}
`
}
```

**Step 4: Run tests**

Run: `mise test`
Expected: PASS

**Step 5: Integrate SKILL.md generation into scrape pipeline**

Update `src/scrape.ts` to call `generateSkillMd` after scraping all chapters, reading frontmatter from each written file to build the chapter entries. Write SKILL.md to the project root.

**Step 6: Run full scrape and verify SKILL.md**

Run: `mise scrape`
Expected: SKILL.md at project root with correct chapter index

**Step 7: Commit**

```
feat: Generate SKILL.md with chapter index

Builds the skill definition file automatically from
scraped chapter metadata, including a full chapter
index table.
```

---

### Task 5: Zip packager

**Files:**
- Create: `src/package.ts`
- Create: `src/package.test.ts`

**Step 1: Write failing test for package assembly**

Create `src/package.test.ts`:

```typescript
import { describe, expect, test } from "bun:test"
import { buildZip } from "./package"
import { existsSync, rmSync } from "fs"

describe("buildZip", () => {
  test("creates a zip containing SKILL.md and chapters", async () => {
    const outPath = "/tmp/test-green-book-skill.zip"
    if (existsSync(outPath)) rmSync(outPath)

    await buildZip(outPath)

    expect(existsSync(outPath)).toBe(true)
    // Verify zip contents using Bun's unzip or similar
  })
})
```

Note: This test requires that SKILL.md and chapters/ exist (from a prior scrape run). It's an integration test.

**Step 2: Implement buildZip**

Create `src/package.ts`:

```typescript
import { readdir, readFile } from "fs/promises"
import { join } from "path"

const ROOT = join(import.meta.dir, "..")
const CHAPTERS_DIR = join(ROOT, "chapters")

export async function buildZip(outPath: string) {
  const skillMd = await readFile(join(ROOT, "SKILL.md"))
  const chapterFiles = await readdir(CHAPTERS_DIR)
  const files: Record<string, Uint8Array> = {
    "SKILL.md": skillMd,
  }
  for (const f of chapterFiles) {
    if (f.endsWith(".md")) {
      files[`chapters/${f}`] = await readFile(join(CHAPTERS_DIR, f))
    }
  }

  // Use Bun's native zip support or a library
  // Bun doesn't have built-in zip creation as of early 2026
  // Consider using archiver or yazl package
  throw new Error("TODO: implement zip creation — choose archiver or yazl")
}

if (import.meta.main) {
  const version = (await readFile(join(ROOT, "VERSION"), "utf-8")).trim()
  const outPath = join(ROOT, `green-book-skill-${version}.zip`)
  await buildZip(outPath)
  console.log(`Packaged: ${outPath}`)
}
```

Note: Bun may have native zip support by the time of implementation — check `Bun.write` docs. If not, add `archiver` or `yazl` to dependencies.

**Step 3: Run test**

Run: `mise test`
Expected: PASS (after implementing zip creation)

**Step 4: Update VERSION with dateVer**

Update `src/scrape.ts` (or the release task) to write today's date as the VERSION:

```typescript
const today = new Date()
const version = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`
await writeFile(join(ROOT, "VERSION"), version + "\n")
```

**Step 5: Commit**

```
feat: Add zip packager for distribution

Bundles SKILL.md and all chapter files into a zip
for upload to claude.ai or use in Claude Code.
```

---

### Task 6: GitHub Actions

**Files:**
- Create: `.github/workflows/check-updates.yml`
- Create: `.github/workflows/release.yml`

**Step 1: Create check-updates.yml**

```yaml
name: Check for Green Book updates

on:
  schedule:
    - cron: "0 9 * * 1" # Weekly Monday 9am UTC
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: jdx/mise-action@v2

      - run: mise scrape

      - name: Check for changes
        id: diff
        run: |
          if git diff --quiet chapters/ SKILL.md; then
            echo "changed=false" >> "$GITHUB_OUTPUT"
          else
            echo "changed=true" >> "$GITHUB_OUTPUT"
            echo "## Changed files" >> "$GITHUB_STEP_SUMMARY"
            git diff --name-only chapters/ SKILL.md >> "$GITHUB_STEP_SUMMARY"
          fi

      - name: Create PR
        if: steps.diff.outputs.changed == 'true'
        run: |
          BRANCH="auto-update/$(date +%Y-%m-%d)"
          git checkout -b "$BRANCH"
          git add chapters/ SKILL.md VERSION
          git commit -m "chore: Update Green Book content

          Automated update detected changes in Green Book
          chapters from gov.uk."
          git push -u origin "$BRANCH"
          gh pr create \
            --title "Update Green Book content $(date +%Y.%m.%d)" \
            --body "Automated update — review changed chapters before merging."
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Step 2: Create release.yml**

```yaml
name: Release

on:
  push:
    branches: [main]
    paths: [chapters/**, SKILL.md, VERSION]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: jdx/mise-action@v2

      - run: mise package

      - name: Read version
        id: version
        run: echo "version=$(cat VERSION)" >> "$GITHUB_OUTPUT"

      - name: Create release
        run: |
          gh release create "${{ steps.version.outputs.version }}" \
            green-book-skill-*.zip \
            --title "Green Book Skill ${{ steps.version.outputs.version }}" \
            --notes "Content snapshot from $(cat VERSION)."
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Step 3: Commit**

```
ci: Add update checker and release workflows

Weekly cron checks for Green Book changes and opens
a PR. Release workflow packages and publishes a
GitHub release on merge to main.
```

---

### Task 7: Initial scrape and first release

**Step 1: Run full scrape**

Run: `mise scrape`
Expected: All chapters written to `chapters/`, SKILL.md generated, VERSION updated

**Step 2: Inspect output quality**

Manually review 5+ chapter files across both Part 1 and Part 2. Check:
- Frontmatter is correct (title, source URL, last updated)
- Headings preserved
- Tables readable
- No navigation/chrome leaked through
- No content truncated

**Step 3: Fix any conversion issues**

Iterate on `src/convert.ts` until output quality is acceptable.

**Step 4: Run typecheck and tests**

Run: `mise ci`
Expected: All checks pass

**Step 5: Commit chapters and SKILL.md**

```
feat: Add initial Green Book content

Scraped all chapters from gov.uk and generated
SKILL.md with the full chapter index. Content
snapshot 2026.03.04.
```

**Step 6: Push and verify GitHub Actions**

Push to main. Verify the release workflow triggers and creates a GitHub release with the zip attached.
