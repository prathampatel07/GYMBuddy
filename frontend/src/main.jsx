import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App.jsx';
import { queryClient } from './lib/queryClient.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#111827',
            color: '#f3f4f6',
            border: '1px solid #1f2937',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: '600',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#0a0e1a' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#0a0e1a' },
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>
);
