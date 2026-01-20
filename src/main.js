import "./assets/main.css";

import { createApp } from "vue";
import "./assets/load.css";

import App from "./App.vue";
import router from "./route.js";

const app = createApp(App);
app.use(router);
app.mount(document.body);
