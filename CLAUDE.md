# UKHSA Green Book Skill

Agent Skill bundling the complete UK Green Book on immunisation as grounding
material for Claude. Bun + mise tooling.

## Quick Start

```
mise trust -y
mise bundle
mise scrape
mise package
```

## Project Structure

- `SKILL.md` — skill definition + chapter index
- `chapters/` — one markdown file per Green Book chapter (with YAML frontmatter)
- `src/scrape.ts` — scrapes Green Book chapter PDFs from gov.uk
- `src/package.ts` — assembles zip for distribution
- `src/scrape.test.ts` — tests for the scraper
- `figures/` — extracted images from PDFs (via `pdfimages`)
- `mise.toml` — task definitions (use `mise` tasks, not direct bun commands)
- `.github/workflows/` — auto-update detection + release publishing

## Tooling

- Use `mise` tasks instead of direct bun commands
- Bun version managed by mise (see `mise.toml`)
- `mise ci` — run all checks (typecheck + tests + format)
- `mise format` / `mise format:fix` — check or fix Prettier formatting
- `mise release` — full pipeline: scrape, generate, package

## Commits

[Conventional Commits](https://www.conventionalcommits.org/).

- Subject line max ~50 characters (including prefix), be terse
- Capitalize the subject after the prefix (e.g., `feat: Add thing` not `feat:
add thing`)
- Pick the right prefix:
  - `feat:` only for application features visible to end users
  - `chore:` for tooling and infrastructure
  - `docs:` for README changes
  - `ci:` for CI changes
  - Split into separate commits when spanning multiple types
- Blank line, then 1-3 sentence body explaining "why"
- Hard-wrap every line at 72 characters
- No bullet points, NEVER add "Co-Authored-By" or other footers
- Check `git log -n 5` first to match existing style
- Never use `--oneline` — commit bodies carry important context

## PRs

- Write a short essay (1-2 paragraphs) describing why changes are needed
- Don't hard-wrap PR body text (GitHub renders with browser reflow)
- NEVER add a Claude Code attribution footer

## Chapter Conversion

PDFs in `pdfs/` are converted to markdown in `chapters/`. The conversion
must be faithful to the source PDF:

- Preserve all content verbatim — every paragraph, bullet, reference, URL
- Never strip, rewrite, or omit content, even if it seems outdated or broken
- Dead URLs stay as-is — they are part of the historical record
- Only fix obvious typos (missing words, duplicated text, OCR artefacts)
- Never add editorial notes, commentary, or content not in the PDF
- Prefix bare URLs with `https://` but do not alter or remove any URL
- Only prefix bare URLs (no protocol); preserve explicit `http://` as-is
- Use YAML frontmatter: title, chapter, last_updated (from PDF), source
- Zero-pad chapter filenames: `ch01.md` not `ch1.md`
- Preserve footnote markers verbatim (¥, \*, † etc.) in both references and
  definitions
- Diagrams/flowcharts: extract with `pdfimages -png` to `figures/`, link as `![caption](figures/chNN-fig.png)`
- Simple flowcharts can be represented as text descriptions instead

## Branching

- Never commit directly to main; always create a feature branch first
