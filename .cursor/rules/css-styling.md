# CSS Styling Rule

**CRITICAL: Before adding custom CSS to prototypes, check existing global stylesheets first.**

Global app styles live in **`src/styles/`** (not under individual prototypes). For where code belongs in the repo, see [src-folder-layout.md](src-folder-layout.md).

## Global Stylesheets Available

The project has comprehensive global stylesheets that already style common elements:

- `src/styles/main.css` - Main global styles including:
  - Headings (h1, h2, h3, etc.)
  - Lists (ul, ol, li)
  - Links (a, a:hover, a:visited, etc.)
  - Paragraphs, tables, forms
  - Codex design tokens and variables
  
- `src/styles/load.css` - Additional styles for rendered content

- `src/styles/tokens.css` - Design tokens

- `src/styles/colors.css` - Color definitions

## When NOT to Add Custom CSS

**Do NOT add custom CSS for simple, standard HTML elements** that are already styled globally:

❌ **Don't add CSS for:**
- Simple lists (`ul`, `ol`, `li`) - already styled
- Basic headings (`h1`, `h2`, `h3`) - already styled
- Standard links (`a`, `a:hover`) - already styled
- Paragraphs (`p`) - already styled
- Basic containers (`section`, `div`) - use existing spacing/gap utilities
- Form elements - Codex components handle styling
- Simple text elements (`span`, `strong`, `em`) - already styled

## When Custom CSS IS Appropriate

✅ **Add custom CSS only when:**
- Creating unique, prototype-specific layouts (grids, complex positioning)
- Styling custom components not covered by global styles
- Adding prototype-specific visual effects or animations
- Overriding global styles for a specific prototype's needs (document why)
- Styling elements that truly need prototype-specific treatment

## Examples

### ❌ Bad: Unnecessary Custom CSS
```vue
<style scoped>
.links-list {
  margin: 0;
  padding-left: 1.5rem;
  list-style-type: decimal;
}

.link-item a {
  color: var(--color-progressive);
  text-decoration: none;
}

.link-item a:hover {
  text-decoration: underline;
}
</style>
```
**Why:** Lists and links are already styled globally. The browser default for `ol` is fine, and links already have proper styling.

### ✅ Good: Minimal or No Custom CSS
```vue
<template>
  <ol>
    <li v-for="item in items" :key="item.id">
      <a :href="item.url">{{ item.title }}</a>
    </li>
  </ol>
</template>
<!-- No custom CSS needed! -->
```

### ✅ Good: Custom CSS for Unique Layout
```vue
<style scoped>
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}
</style>
```
**Why:** This is a unique grid layout specific to this prototype.

## Process Before Adding CSS

1. **Check `src/styles/main.css`** - Does it already style this element?
2. **Check Codex components** - Can you use a Codex component instead?
3. **Check design tokens** - Can you use existing CSS variables?
4. **Ask yourself:** Is this styling truly unique to this prototype, or is it just standard HTML?

## AI Agent Instructions

When working on prototypes:
1. **Always check** `src/styles/main.css` and `src/styles/load.css` before adding `<style>` blocks
2. **Prefer** using standard HTML elements with global styles over custom CSS
3. **Minimize** custom CSS - only add what's absolutely necessary
4. **Remove** unnecessary CSS if you find it in existing prototypes
5. **Use** Codex components and design tokens instead of custom styles when possible

## Common Patterns

- **Lists:** Just use `<ul>` or `<ol>` - no custom CSS needed
- **Links:** Just use `<a>` - global styles handle colors, hover, etc.
- **Headings:** Just use `<h1>`, `<h2>`, etc. - already styled
- **Containers:** Use semantic HTML and existing gap utilities
- **Forms:** Use Codex components (`CdxTextInput`, `CdxButton`, etc.)

Remember: **Less CSS is better CSS.** Trust the global stylesheets.
