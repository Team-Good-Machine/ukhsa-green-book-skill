# ukhsa-green-book-skill

Agent Skill bundling the complete [UK Green Book on
Immunisation](https://www.gov.uk/government/collections/immunisation-against-infectious-disease-the-green-book)
as grounding material for Claude, ChatGPT, and other skill-compatible AI agents.
The skill ensures answers are grounded in Green Book guidance.

## Install

Download the latest `.skill` from the [releases
page](https://github.com/Team-Good-Machine/ukhsa-green-book-skill/releases) and
give it to Claude.

## Development

Requires [mise](https://mise.jdx.dev), automatically installs `bun`:

```
mise trust -y
mise bundle
```

## Scraping

Fetches all Green Book chapters from gov.uk and converts them to markdown:

```
mise scrape
```

## Packaging

Bundles SKILL.md and chapters into a distributable zip:

```
mise package
```

## Testing

```
mise test
```

## License

[MIT](LICENSE).
