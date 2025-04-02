import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import HomePage from '../views/HomePage.vue';
import TimerPage from '../views/TimerPage.vue';
import HistoryPage from '../views/HistoryPage.vue';
import SettingsPage from '../views/SettingsPage.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/timer'
  },
  {
    path: '/tabs/',
    component: HomePage,
    children: [
      {
        path: '',
        redirect: '/tabs/timer'
      },
      {
        path: 'timer',
        component: TimerPage
      },
      {
        path: 'history',
        component: HistoryPage
      },
      {
        path: 'settings',
        component: SettingsPage
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
