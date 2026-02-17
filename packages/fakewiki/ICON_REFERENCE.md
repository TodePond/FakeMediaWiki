# Icons reference

Quick reference for **Codex icons** (`@wikimedia/codex-icons`) used in this project. For the full icon set and component usage, see the [Codex Icons documentation](https://doc.wikimedia.org/codex/latest/icons/all-icons.html).

## Import and use

Icons are imported from `@wikimedia/codex-icons` and rendered with Codex’s `CdxIcon`:

```vue
<script setup>
import { CdxIcon } from "@wikimedia/codex"
import { cdxIconHeart, cdxIconLinkExternal } from "@wikimedia/codex-icons"
</script>

<template>
  <CdxIcon :icon="cdxIconHeart" />
</template>
```

## Icons used in this project

| Icon | Usage |
|------|--------|
| `cdxIconLinkExternal` | External link (e.g. feed items → revisions) |
| `cdxIconHeart` | “Thank” actions on revisions |
| `cdxIconRobot` | Bot edits |
| `cdxIconArticle` | Article/document (e.g. placeholder for page thumbnails) |
| `cdxIconPushPin` | Pinned prototypes (e.g. home view) |

## Adding a new icon

1. Find the icon in [Codex Icons](https://doc.wikimedia.org/codex/latest/icons/all-icons.html).
2. Import it from `@wikimedia/codex-icons`.
3. Pass it to `CdxIcon` via the `:icon` prop.
4. Optionally add it to the table above for future reference.
