---
description: Prototypes must not reference other prototypes' code
globs: src/prototypes/**
alwaysApply: false
---

# Prototypes: no cross-references

Each prototype under `src/prototypes/` must **not** depend on another prototype's files. Shared behavior belongs in **`src/modules/`** (see [src-folder-layout.md](src-folder-layout.md)).

## Do not

- **Import another prototype's CSS** (e.g. `@import "../OtherPrototype/style.css";` or `@import "../OtherPrototype/global.css";`)
- Import another prototype's JS/TS, Vue SFCs, or composables from `src/prototypes/<Other>/...`

## Do

- **Import shared code from `src/modules/`** (e.g. `@/modules/ReviewChanges/...`, `@/modules/VisualEditor/...`) when multiple prototypes need the same UI or logic
- **Import VE bridge code from `@repo-lib/...`** when the prototype needs VisualEditor loading or diff helpers
- Use normal dependencies (`fakewiki`, `@wikimedia/codex`, etc.)
- Keep prototype-only styles in that prototype's own `style.css` / `global.css`
- Keep prototype-only components and scripts inside that prototype's directory

## If you need something another prototype has

- **Used in several prototypes:** extract or add it under the right **`src/modules/<Name>/`** folder (or split modules if ownership differs).
- **Truly one-off:** copy or reimplement inside the current prototype only—do not import the other prototype's tree.

This keeps prototypes runnable without hidden peer dependencies while allowing intentional sharing through **modules** (and **`lib/`** for VE).
