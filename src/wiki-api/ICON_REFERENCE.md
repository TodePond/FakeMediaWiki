# Codex icons reference

This document lists icons from `@wikimedia/codex-icons` used in this project.

## Importing icons

```typescript
import { cdxIconHeart, cdxIconLinkExternal } from "@wikimedia/codex-icons"
```

## Using icons

```vue
<template>
	<CdxIcon :icon="cdxIconHeart" />
</template>
```

## Icons used in this project

### Navigation & links

- `cdxIconLinkExternal` - External link icon (used in feed items to link to revisions)

### Actions

- `cdxIconHeart` - Heart icon (used for "thank" actions on revisions)
- `cdxIconRobot` - Bot icon (used to indicate bot edits)

### Content

- `cdxIconArticle` - Article/document icon (used as placeholder for page thumbnails)
- `cdxIconPushPin` - Pin icon (used in home view for pinned prototypes)

## Finding more icons

All available icons can be found in the [Codex Icons Documentation](https://doc.wikimedia.org/codex/latest/icons/all-icons.html).

To use a new icon:

1. Import it from `@wikimedia/codex-icons`
2. Pass it to the `CdxIcon` component via the `:icon` prop

Example:

```vue
<script setup>
import { CdxIcon } from "@wikimedia/codex"
import { cdxIconSearch } from "@wikimedia/codex-icons"
</script>

<template>
	<CdxIcon :icon="cdxIconSearch" />
</template>
```
