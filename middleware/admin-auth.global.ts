import { defineNuxtRouteMiddleware, useCookie, useRequestHeaders, navigateTo } from '#imports';

export default defineNuxtRouteMiddleware((to) => {
  let isAuth = false;

  // 1. Read cookie from Nuxt composable
  const cookie = useCookie('organizer_session', { path: '/' });
  if (cookie.value === 'true') {
    isAuth = true;
  }

  // 2. Double check raw request headers on SSR server
  if (import.meta.server && !isAuth) {
    const headers = useRequestHeaders(['cookie']);
    const rawHeader = headers.cookie || '';
    if (rawHeader.includes('organizer_session=true')) {
      isAuth = true;
      cookie.value = 'true'; // Sync composable
    }
  }

  // 3. Double check document.cookie on client
  if (import.meta.client && !isAuth) {
    if (typeof document !== 'undefined' && document.cookie.includes('organizer_session=true')) {
      isAuth = true;
      cookie.value = 'true'; // Sync composable
    }
  }

  // Check URL query parameter ?key=ethchess2026
  const keyQuery = to.query.key;
  const organizerKey = 'ethchess2026';

  if (typeof keyQuery === 'string' && keyQuery.trim() === organizerKey) {
    cookie.value = 'true';
    isAuth = true;
    return navigateTo('/', { replace: true });
  }

  // If user visits /login explicitly
  if (to.path === '/login') {
    if (isAuth) {
      return navigateTo('/');
    }
    return;
  }

  // Public roster routes (/t/*), 404 page, and API endpoints are accessible to all
  if (to.path.startsWith('/t/') || to.path === '/404' || to.path.startsWith('/api/')) {
    return;
  }

  // For / and /admin/*: If not authenticated, redirect to /404 page!
  if (!isAuth) {
    return navigateTo('/404');
  }
});
