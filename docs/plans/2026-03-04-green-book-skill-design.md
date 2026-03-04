# UKHSA Green Book Skill — Design

**Version:** dateVer (e.g. 2026.03.04)
**Status:** Approved
**Date:** 2026-03-04

## Overview

A self-contained Agent Skill that bundles the complete UK Green Book on immunisation as grounding material for Claude. Primary deployment via Slack bot; also works standalone on claude.ai and Claude Code.

## Project Structure

```
ukhsa-green-book-skill/
├── SKILL.md                          # Skill def + chapter index
├── chapters/                         # One .md per chapter (with frontmatter)
├── src/
│   ├── scrape.ts                     # Scrape gov.uk → markdown
│   └── package.ts                    # Assemble zip
├── .github/workflows/
│   ├── check-updates.yml             # Weekly: detect changes, open PR
│   └── release.yml                   # On merge: package + GH release
├── mise.toml                         # Bun tooling + task aliases
├── package.json
├── VERSION                           # dateVer (2026.03.04)
└── LICENSE
```

## SKILL.md

Contains:
- Purpose statement
- Chapter index table (title + last-updated date per chapter)
- Minimal usage note: consult relevant chapters, distinguish Green Book guidance from general knowledge
- Content date disclaimer
- Not prescriptive about response format — provides grounding, not behavioral rules

## Build Pipeline (Bun + mise)

- `mise scrape` — fetch Green Book collection page from gov.uk, download each chapter as HTML, convert to clean markdown with YAML frontmatter, write to `chapters/`
- `mise package` — bundle SKILL.md + chapters into a distributable zip
- `mise release` — scrape + package + update VERSION with today's dateVer

## Content Format

Each chapter file:
- YAML frontmatter: title, chapter number, last updated date, source URL
- Clean markdown: clinical content only, no navigation/chrome
- Preserved heading hierarchy, tables, lists, emphasis

## GitHub Actions

### check-updates.yml (weekly cron)
1. Run scrape
2. Diff against current chapters
3. If changes detected: create branch, commit, open PR with change summary

### release.yml (on merge to main)
1. Run package
2. Create GitHub release with dateVer tag
3. Attach zip to release

## Behavioral Boundaries

- Green Book is primary authority
- Supplemented by Claude's general knowledge with clear attribution
- No response format constraints

## Tooling

- **Runtime:** Bun (latest, via mise)
- **Task runner:** mise with namespaced tasks
- **Versioning:** dateVer (YYYY.MM.DD)
- **Distribution:** GitHub releases (no dist/ in repo)

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | All chapters | Comprehensive coverage |
| Content bundling | Full content in skill | Works standalone without search |
| Knowledge gaps | Green Book + general knowledge | Clear attribution between sources |
| File structure | One .md per chapter | Easy to update individually |
| Build tooling | Bun + mise | Great DX, TypeScript native |
| Versioning | dateVer | Content is date-anchored |
| Distribution | GitHub releases | No artifacts in repo |
| Response style | Non-prescriptive | Skill provides grounding, not behavior |
| User overrides | None | YAGNI |
