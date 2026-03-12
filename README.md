# ukhsa-green-book-skill

Agent skill bundling the complete [UK Green Book on
Immunisation](https://www.gov.uk/government/collections/immunisation-against-infectious-disease-the-green-book)
in converted markdown format, to be used as grounding material for Claude,
ChatGPT, Gemini, and other skill-compatible AI agents.

## Install

### Claude Code, Cursor, Copilot, Codex, and other agents

```sh
npx skills add Team-Good-Machine/ukhsa-green-book-skill
```

### claude.ai

Download the latest `.zip` from the [releases
page](https://github.com/Team-Good-Machine/ukhsa-green-book-skill/releases)
and add it to your project knowledge, or paste the SKILL.md contents into
your conversation.

## Development

Requires [mise](https://mise.jdx.dev), automatically installs `bun`:

```
mise trust -y
mise bundle
```

## Scraping

Fetches all Green Book chapter PDFs from gov.uk:

```
mise scrape
```

## Packaging

Bundles SKILL.md and chapters into a distributable zip:

```
mise package
```

## Importing a chapter

Chapters are converted manually from the official PDFs with Claude Code.
The scraper (`mise scrape`) downloads PDFs to `pdfs/`; conversion to
markdown is a separate human-in-the-loop process.

### 1. Extract figures

```sh
pdfimages -png pdfs/<slug>.pdf skills/uk-green-book/assets/figures/chNN-raw
```

Rename the raw extracts to match the figure numbering in the PDF (e.g.
`skills/uk-green-book/assets/figures/ch21-fig1.png`). For vector-only
figures that `pdfimages` misses, rasterise the relevant page and crop:

```sh
pdftoppm -png -f PAGE -l PAGE -r 200 pdfs/<slug>.pdf tmp/chNN
magick tmp/chNN-PAGE.png -crop WxH+X+Y skills/uk-green-book/assets/figures/chNN-figN.png
```

### 2. Convert PDF to markdown

We tested multiple automated PDF to MD workflows, but all had issues. You can
use [poppler](https://poppler.freedesktop.org) and then combine it with a LLM +
manual human refinement step

Open Claude Code and read the PDF directly (use page ranges for large
chapters). Write the output to `skills/uk-green-book/references/chNN.md` with YAML
frontmatter:

```yaml
---
title: "Chapter title"
chapter: NN
last_updated: "DD Month YYYY"
source: "https://www.gov.uk/government/publications/..."
---
```

Conversion rules (see `CLAUDE.md` for the full list):

- Preserve all content verbatim — every paragraph, bullet, reference, URL
- Only fix obvious typos; never add editorial notes or commentary
- Prefix bare URLs with `https://` but keep explicit `http://` as-is
- Link figures as `![Short title](../assets/figures/chNN-fig.png)` with a
  full caption paragraph below

### 3. Review

Spawn a reviewer agent to compare the markdown against the source PDF. Also skim
it with a pair of human eyes.

### 4. Commit

One chapter per commit using conventional commits:

```
feat: Add chapter NN <title>

<description>
```

### 5. Update SKILL.md

Add the chapter to the index table with its description, approximate
token count, and file link.

## Releasing

Releases are automated via GitHub Actions using calendar versioning
(dateVer).

When content changes under `skills/uk-green-book/` are pushed
to `main`, the [release workflow](.github/workflows/release.yml):

1. Runs `mise package` to build `green-book.zip`
2. Creates a GitHub release tagged `vYYYY.MM.DD` with auto-generated
   notes
3. Uploads the zip as a release asset

Same-day re-releases get a `.N` suffix (e.g. `v2026.03.05.1`).

### Update detection

A [weekly cron job](.github/workflows/check-updates.yml) runs every
Monday and scrapes gov.uk for updated chapter PDFs. If any PDFs changed,
it opens a PR with the new files so a human can re-convert the affected
chapters.

## Testing

```
mise test
```

## License

[MIT](LICENSE).
