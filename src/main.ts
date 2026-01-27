import { createApp } from "vue"

import App from "./App.vue"
import router from "./route"

const app = createApp(App)
app.use(router)

// Navigate to initial route if specified by entry point
interface WindowWithInitialRoute extends Window {
	__INITIAL_ROUTE__?: string
}

declare const window: WindowWithInitialRoute

if (window.__INITIAL_ROUTE__) {
	router.push(window.__INITIAL_ROUTE__)
}

app.mount(document.body)
