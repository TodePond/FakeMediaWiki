import { createRouter, createWebHistory } from "vue-router"

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: "/",
			name: "Home",
			component: () => import("./views/HomeView.vue"),
		},
		{
			path: "/Special/:name",
			name: "Special",
			component: () => import("./views/SpecialView.vue"),
		},
		{
			path: "/Fullscreen/:name",
			name: "Fullscreen",
			component: () => import("./views/Fullscreen.vue"),
		},
		{
			path: "/Tablet/:name",
			name: "Tablet",
			component: () => import("./views/TabletView.vue"),
		},
	],
})

export default router
