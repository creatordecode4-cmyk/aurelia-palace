export const SITE_NAME = 'Aurelia Palace'
export const SITE_DESCRIPTION =
  'A cinematic scroll journey through Aurelia Palace, a fictional heritage hotel on the ghats of Varanasi.'

// Vercel exposes the production domain at build time; fall back to localhost for local builds.
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000'
