import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/* When a new version is deployed, its service worker takes over the page
   (skipWaiting + clientsClaim) but the old code stays on screen until the
   next reload, so staff kept seeing the previous release. Reload once when
   that hand-over happens. Skipped on first install, when there was no
   previous worker and the page is already current. */
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}
