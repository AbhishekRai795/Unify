import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { BrowserRouter } from 'react-router-dom';

// FIX: Polyfill for 'global' object for amazon-cognito-identity-js
// This must be at the top of your entry file.
if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
