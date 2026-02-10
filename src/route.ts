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
			path: "/Mobile/:name",
			name: "Mobile",
			component: () => import("./views/Mobile.vue"),
		},
		{
			path: "/Component/:name",
			name: "Component",
			component: () => import("./views/ComponentView.vue"),
		},
	],
})

export default router
