# enwiki TextMatch Production Reference

This file captures the production `textMatch` configuration observed on English Wikipedia for prototype planning.

Scope:

- Wiki: English Wikipedia only (`enwiki`)
- Feature: VisualEditor EditCheck `textMatch`
- Snapshot source: live on-wiki config pages

Primary sources:

- Main editcheck config (raw JSON): [MediaWiki:Editcheck-config.json](https://en.wikipedia.org/w/index.php?title=MediaWiki:Editcheck-config.json&action=raw)
- Imported British-English replacements (raw JSON): [MediaWiki:Editcheck-config-textmatch-british-english.json](https://en.wikipedia.org/w/index.php?title=MediaWiki:Editcheck-config-textmatch-british-english.json&action=raw)

## Active matchItems on enwiki

Current `textMatch.matchItems` keys:

1. `british-english`
2. `LLM-user-comms`
3. `LLM-immediate-indicators`
4. `LLM-multiple-indicators`

Counts observed:

- `LLM-user-comms`: 22 phrases
- `LLM-immediate-indicators`: 37 phrases
- `LLM-multiple-indicators`: 74 phrases (`minOccurrences: 3`)
- `british-english`: import file with 464 replacement pairs

## Why the 464 pairs are not duplicated here

The full 464-pair dictionary is maintained on-wiki and may change. Duplicating the entire map here would quickly become stale.

For source-of-truth access, use:

- [https://en.wikipedia.org/w/index.php?title=MediaWiki:Editcheck-config-textmatch-british-english.json&action=raw](https://en.wikipedia.org/w/index.php?title=MediaWiki:Editcheck-config-textmatch-british-english.json&action=raw)

Representative examples from that file:

- `analyze -> analyse`
- `color -> colour`
- `center -> centre`
- `defense -> defence`
- `favorite -> favourite`

## Notes for prototype usage

- For off-wiki prototype behavior, treat enwiki config as canonical.
- The full LLM phrase buckets are copied into `ENWIKI_TEXTMATCH_LLM_TERMS.json`.
- British-English replacements should be fetched from the on-wiki source URL above when a full table is needed.
