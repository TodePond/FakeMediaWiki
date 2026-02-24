---
description: Prototypes must not reference other prototypes' code
globs: src/prototypes/**
alwaysApply: false
---

# Prototypes: no cross-references

Each prototype under `src/prototypes/` must be **self-contained**. Prototypes must **never** reference another prototype's code.

## Do not

- **Import another prototype's CSS** (e.g. `@import "../OtherPrototype/style.css";` or `@import "../OtherPrototype/global.css";`)
- Import or require another prototype's JS/TS, Vue components, or composables
- Depend on another prototype's files in any way

## Do

- Duplicate or inline any styles or logic you need from another prototype into the current prototype's own files
- Keep all of a prototype's styles in its own `style.css` and `global.css`
- Keep all of a prototype's logic and components within its own directory

This keeps prototypes independently runnable and avoids hidden dependencies between them.
