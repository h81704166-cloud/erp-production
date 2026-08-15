import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

// Register PWA Service Worker for offline availability (production only)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const isProd = process.env.NODE_ENV === 'production' && Boolean(import.meta.env?.PROD);
  if (isProd) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA SW] Service Worker registered successfully for offline support:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA SW] Service Worker registration skipped:', err);
        });
    });
  } else {
    // Unregister service worker and purge caches in development mode to prevent intercepting Vite dev modules
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name);
        }
      });
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

