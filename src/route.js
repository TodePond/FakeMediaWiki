import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  // @ts-expect-error - trust me
  history: createWebHashHistory(import.meta.env.BASE_URL),
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
  ],
});

export default router;
