# UKHSA Green Book Skill

Agent Skill bundling the complete UK Green Book on immunisation as grounding
material for Claude. Bun + mise tooling.

## Project Structure

- `SKILL.md` — skill definition + chapter index
- `chapters/` — one markdown file per Green Book chapter (with YAML frontmatter)
- `src/scrape.ts` — scrapes gov.uk, converts chapters to markdown
- `src/package.ts` — assembles zip for distribution
- `mise.toml` — task definitions (use `mise` tasks, not direct bun commands)
- `.github/workflows/` — auto-update detection + release publishing

## Tooling

- Use `mise` tasks instead of direct bun commands
- Bun version managed by mise (see `mise.toml`)

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

## Branching

- Never commit directly to main; always create a feature branch first
