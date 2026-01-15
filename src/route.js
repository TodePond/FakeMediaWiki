import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import SpecialView from './views/SpecialView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomeView,
    },
    {
      path: '/Special/:name',
      name: 'Special',
      component: SpecialView,
    },
  ],
});

export default router;
