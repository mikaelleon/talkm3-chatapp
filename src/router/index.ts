import { route } from 'quasar/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';

export default route(function (/* { store, ssrContext } */) {
  // Determine the router history mode based on environment
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
    ? createWebHistory
    : createWebHashHistory;

  const Router = createRouter({
    history: createHistory(process.env.VUE_ROUTER_BASE || '/'), // Use base or fallback to '/'
    routes,
    scrollBehavior: () => ({ left: 0, top: 0 }), // Ensures scrolling starts at the top of the page
  });

  // Optional: Add any route guards here (e.g., for authentication)
  // Router.beforeEach((to, from, next) => {
  //   // Example: Redirect to login if not authenticated
  //   const isAuthenticated = !!localStorage.getItem('userToken');
  //   if (to.matched.some(record => record.meta.requiresAuth) && !isAuthenticated) {
  //     next({ name: 'Login' });
  //   } else {
  //     next();
  //   }
  // });

  return Router;
});
