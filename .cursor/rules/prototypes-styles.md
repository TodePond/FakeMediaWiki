# Prototype styles: use style.css and global.css

For prototypes under `src/prototypes/`, keep prototype-specific component styles in the prototype's `style.css` file. Do not add `<style scoped>` blocks with CSS inside the Vue file.

## Pattern

- **✅ Do:** Put scoped, prototype-specific styles in `src/prototypes/<Name>/style.css` and import it from `index.vue` with a single scoped import:

  ```vue
  <style scoped>
  @import "./style.css";
  </style>
  ```

- **❌ Don’t:** Add extra `<style scoped>` blocks in the Vue file with additional CSS. Move any such CSS into `style.css` instead.

## When to use global.css

Use a prototype-local `global.css` when styles must be unscoped and apply to HTML generated content or shared page-level elements that Vue scoped CSS cannot reliably target.

- **Use `global.css` for:**
  - Rendered markup from external/parsing pipelines (for example `v-html` output)
  - Global element resets or base typography tweaks that should apply across the whole prototype view
  - Rules that need to affect descendants outside scoped style boundaries

- **Use `style.css` for:**
  - Component classes and UI structure owned by the prototype template
  - Interactive controls, layout wrappers, and prototype-specific visual states
  - Any style that should stay isolated to that prototype instance

## Why split them

- Keeps scoped component styles predictable and easy to maintain
- Avoids accidental global leakage from styles that should be local
- Makes intentional global styling explicit in one place (`global.css`)
- Keeps `index.vue` focused on template/script with style files imported
