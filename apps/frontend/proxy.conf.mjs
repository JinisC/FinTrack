// Dev-server-proxy: `/api` gaat naar de finance-service, zodat er geen CORS nodig is.
// De e2e-tests wijzen via FINANCE_SERVICE_URL naar hun eigen instantie.
export default {
  '/api': {
    target: process.env.FINANCE_SERVICE_URL ?? 'http://localhost:3000',
    secure: false,
  },
};
