// API base URL
// For local development: use localhost:4000
// For production: use backend Vercel deployment
export const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:4000"
    : "https://court-geo-backend.vercel.app/api";