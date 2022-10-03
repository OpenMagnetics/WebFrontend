import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/musings',
    name: 'Musings',
    component: () => import('../views/Musings.vue')
  },
  {
    path: '/cookie_policy',
    name: 'CookiePolicy',
    component: () => import('../views/CookiePolicy.vue')
  },
  {
    path: '/legal_notice',
    name: 'LegalNotice',
    component: () => import('../views/LegalNotice.vue')
  },
  {
    path: '/musings/:index',
    name: 'MusingLoader',
    component: () => import('../views/MusingsLoader.vue')
  },
  {
    path: '/roadmap',
    name: 'Roadmap',
    component: () => import('../views/Roadmap.vue')
  },
]
const router = createRouter({
  history: createWebHistory(),
  routes,
});
export default router