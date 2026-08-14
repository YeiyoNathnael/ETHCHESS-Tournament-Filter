import { defineEventHandler, deleteCookie } from 'h3';

export default defineEventHandler((event) => {
  deleteCookie(event, 'organizer_session', {
    path: '/',
  });

  return {
    success: true,
    message: 'Organizer session logged out',
  };
});
