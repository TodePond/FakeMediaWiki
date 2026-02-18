# Prototype styles: use style.css

For prototypes under `src/prototypes/`, keep **all** component styles in the prototype’s `style.css` file. Do not add `<style scoped>` blocks with CSS inside the Vue file.

## Pattern

- **✅ Do:** Put all styles in `src/prototypes/<Name>/style.css` and import it from `index.vue` with a single scoped import:

  ```vue
  <style scoped>
  @import "./style.css";
  </style>
  ```

- **❌ Don’t:** Add extra `<style scoped>` blocks in the Vue file with additional CSS. Move any such CSS into `style.css` instead.

This keeps styling in one place, makes prototypes consistent, and avoids mixing template/script and styles in the same file.
