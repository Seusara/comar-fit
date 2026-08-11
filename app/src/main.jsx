import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { applyTheme, getStoredTheme, watchSystemTheme } from './theme/themes';

applyTheme(getStoredTheme());
watchSystemTheme();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/comar-fit-sw.js').catch(() => {}));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
