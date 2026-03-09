import { createRouter, createWebHistory } from "vue-router"

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: "/",
			name: "Home",
			component: () => import("./views/HomeView/index.vue"),
		},
		{
			path: "/Special/:name",
			name: "Special",
			component: () => import("./views/SpecialView/index.vue"),
		},
		{
			path: "/Chrome/:name",
			name: "Chrome",
			component: () => import("./views/ChromeView/index.vue"),
		},
		{
			path: "/Fullscreen/:name",
			name: "Fullscreen",
			component: () => import("./views/Fullscreen/index.vue"),
		},
		{
			path: "/Mobile/:name",
			name: "Mobile",
			component: () => import("./views/Mobile/index.vue"),
		},
		{
			path: "/Component/:name",
			name: "Component",
			component: () => import("./views/ComponentView/index.vue"),
		},
	],
})

export default router
