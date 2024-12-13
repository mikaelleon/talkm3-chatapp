import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/LoginPage.vue'),
        name: 'LoginPage',
      },
      {
        path: 'profile-setup',
        name: 'ProfileSetup',
        component: () => import('pages/ProfileSetup.vue'), // Profile setup route
      },
      {
        path: 'main-app', // Define the route for MainApp
        name: 'MainApp',
        component: () => import('pages/MainApp.vue'), // Import MainApp component
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
