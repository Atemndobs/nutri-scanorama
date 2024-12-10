import React from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from "@sentry/react";
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Initialize Sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.DEV ? 'development' : 'production',
  debug: import.meta.env.DEV,
  beforeSend(event) {
    // Log the event to console in development
    if (import.meta.env.DEV) {
      console.log('Sending event to Sentry:', event);
    }
    return event;
  },
  integrations: [],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/nutri-scanorama\.vercel\.app/],
});

// Register service worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
})

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
