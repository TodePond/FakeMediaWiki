import { createApp } from "vue";

import App from "./App.vue";
import router from "./route.js";

const app = createApp(App);
app.use(router);

// Navigate to initial route if specified by entry point
// @ts-expect-error - trust me
if (window.__INITIAL_ROUTE__) {
  // @ts-expect-error - trust me
  router.push(window.__INITIAL_ROUTE__);
}

app.mount(document.body);
