# Codex design system reference

This project uses [Codex](https://doc.wikimedia.org/codex/), the Wikimedia design system. This file is a short reference for components and tokens; for full API and usage, see the official docs linked below.

## Components

Commonly used Codex components:

- **CdxButton** - Buttons
- **CdxTextInput** - Text inputs
- **CdxLabel** - Form labels
- **CdxProgressIndicator** - Loading state
- **CdxIcon** - Icons (icons come from `@wikimedia/codex-icons`)
- **CdxCard** - Cards

Example:

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

Icons are provided by `@wikimedia/codex-icons` and rendered with `CdxIcon`. For which icons this project uses and how to add more, see **ICON_REFERENCE.md** in this folder.

## Design tokens

Codex exposes design tokens as CSS variables (e.g. in your app's `tokens.css` or equivalent). Typical names:

- **Colors** - `--color-base`, `--color-progressive`, `--color-destructive`, `--color-subtle`
- **Spacing** - `--spacing-50`, `--spacing-100`, ...
- **Border** - `--border-color-base`, `--border-color-subtle`
- **Background** - `--background-color-base`, `--background-color-interactive`

The delta styles in `fakewiki/style/delta.css` use `--color-content-added` and `--color-content-removed`.

## Documentation

- [Codex](https://doc.wikimedia.org/codex/)
- [Components](https://doc.wikimedia.org/codex/latest/components/overview.html)
- [Design tokens](https://doc.wikimedia.org/codex/latest/design-tokens/overview.html)
- [Icons](https://doc.wikimedia.org/codex/latest/icons/all-icons.html)
