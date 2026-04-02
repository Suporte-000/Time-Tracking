import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Type augmentation for electron API
declare global {
  interface Window {
    electronAPI: import('../main/preload').ElectronAPI;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
