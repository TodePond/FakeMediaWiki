import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import PrototypeView from './views/PrototypeView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/prototype/:name',
      name: 'prototype',
      component: PrototypeView,
    },
  ],
});

export default router;
