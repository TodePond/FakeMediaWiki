---
description: Allowed folders under src/, bootstrap files, and repo-root lib for VE
globs: src/**,lib/**,tsconfig.json,vite.config.ts,index.html,404.html
alwaysApply: false
---

# Source layout (FakeMediaWiki)

## Under `src/`

Keep **`src/`** limited to:

| Area | Purpose |
|------|--------|
| **`src/prototypes/`** | One folder per prototype; rendered inside views via the router. **Not** for shared libraries. |
| **`src/views/`** | App shell and view-level components (e.g. router outlet, home/special/chrome/mobile wrappers). |
| **`src/modules/`** | Shared components, hooks, and TS meant for **multiple** prototypes (e.g. `ReviewChanges`, `VisualEditor`, `ReviewChangesPlus`). |
| **`src/styles/`** | Global stylesheets (`main.css`, `load.css`, `tokens.css`, `colors.css`). Linked from `index.html` / entry HTML as `./src/styles/...`. |

**Bootstrap (stay at `src/` root):** `App.vue`, `main.ts`, `route.ts`.

## Do not add under `src/`

- **`src/components/`** — colocate UI under the module or prototype that owns it.
- **`src/lib/`** — application TypeScript that is not Vue-specific lives at **repo root** (see below).
- **`src/types/`** — colocate `.d.ts` with the code it describes (e.g. next to `lib/` sources).

## Repo-root `lib/` (VisualEditor integration)

- **`lib/visualeditor/`** and related files are the **TypeScript bridge** to assets served from **`public/ve/`** (vendor). They are **not** the same as **`public/ve/lib/`** (bundled third-party scripts).
- Import from the app using the **`@repo-lib/`** alias (see `vite.config.ts` and `tsconfig.json`), e.g. `@repo-lib/visualeditor/loadVe`.
- Do not put compilable `.ts` sources under **`public/`** — Vite copies `public/` verbatim to `dist`.

## Tooling locations

- **`vite-env.d.ts`** — project root (not under `src/`).
- Path alias **`@/`** → `src/`. Path alias **`@repo-lib/`** → repo-root `lib/`.

## Quick decisions

- **Shared across several prototypes?** → Add or extend a folder under **`src/modules/<Name>/`**.
- **Only this prototype?** → Keep it under **`src/prototypes/<Name>/`**.
- **Loads or talks to `/ve` scripts?** → Use **`lib/`** + **`@repo-lib/`**, not `src/lib`.
