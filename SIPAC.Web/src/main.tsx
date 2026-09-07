import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Registro del Service Worker PWA para soporte offline y Push
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registrado exitosamente con scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Fallo al registrar el Service Worker:', err);
      });
  });
} else if ('serviceWorker' in navigator) {
  // En desarrollo también registramos para pruebas locales
  navigator.serviceWorker
    .register('/sw.js')
    .then((reg) => {
      console.log('[PWA-Dev] Service Worker activo:', reg.scope);
    })
    .catch((err) => {
      console.warn('[PWA-Dev] Aviso en registro SW:', err);
    });
}