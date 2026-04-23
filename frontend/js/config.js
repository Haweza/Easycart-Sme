/**
 * EasyCart SME — Environment Configuration
 * ──────────────────────────────────────────
 * Edit API_BASE to point at your Spring Boot server.
 *
 * LOCAL DEV:  http://localhost:8080/api
 * PRODUCTION: https://your-railway-app.railway.app/api
 *
 * For Vercel deployment, this value can be replaced at build time
 * using the VERCEL_ENV or a custom build script.
 */

// Detect environment automatically
const IS_LOCAL = window.location.hostname === 'localhost' ||
                 window.location.hostname === '127.0.0.1';

window.API_BASE_URL = IS_LOCAL
  ? 'http://localhost:8080/api'
  : 'https://your-spring-boot-api.railway.app/api';  // ← UPDATE BEFORE DEPLOYING
