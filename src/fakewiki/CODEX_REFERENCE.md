# Codex design system reference

This project uses [Codex](https://doc.wikimedia.org/codex/), the design system for Wikimedia.

## Components

### Commonly used components

- `CdxButton` - Button component
- `CdxTextInput` - Text input field
- `CdxLabel` - Form label
- `CdxProgressIndicator` - Loading indicator
- `CdxIcon` - Icon component
- `CdxCard` - Card component

### Usage

```vue
<script setup>
import { CdxButton, CdxTextInput, CdxLabel } from "@wikimedia/codex"
</script>

<template>
	<CdxLabel input-id="my-input">Label</CdxLabel>
	<CdxTextInput id="my-input" v-model="value" />
	<CdxButton>Click me</CdxButton>
</template>
```

## Icons

Icons are imported from `@wikimedia/codex-icons`:

```vue
<script setup>
import { CdxIcon } from "@wikimedia/codex"
import { cdxIconHeart, cdxIconLinkExternal } from "@wikimedia/codex-icons"
</script>

<template>
	<CdxIcon :icon="cdxIconHeart" />
</template>
```

### Common icons used in this project

- `cdxIconHeart` - Heart icon (for "thank" actions)
- `cdxIconLinkExternal` - External link icon
- `cdxIconArticle` - Article/document icon
- `cdxIconRobot` - Bot icon
- `cdxIconPushPin` - Pin icon

## Design tokens

Design tokens are available as CSS variables. See `src/style/tokens.css` for the full list.

### Common tokens

- Colors: `--color-base`, `--color-progressive`, `--color-destructive`, `--color-subtle`
- Spacing: `--spacing-50`, `--spacing-100`, etc.
- Border: `--border-color-base`, `--border-color-subtle`
- Background: `--background-color-base`, `--background-color-interactive`

## Documentation

- [Codex Documentation](https://doc.wikimedia.org/codex/)
- [Component Library](https://doc.wikimedia.org/codex/latest/components/overview.html)
- [Design Tokens](https://doc.wikimedia.org/codex/latest/design-tokens/overview.html)
- [Icons](https://doc.wikimedia.org/codex/latest/icons/all-icons.html)
