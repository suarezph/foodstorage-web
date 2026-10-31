import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App.jsx';
import { AuthProvider } from './app/AuthContext.jsx';
import './index.css';

// In-memory cache only: no persistence plugin.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Someone else in the family may have used the milk: refresh when the app comes back.
      refetchOnWindowFocus: true,
      retry: (count, error) => error?.status !== 401 && error?.status !== 403 && count < 1,
    },
  },
});

// Push notifications and "Add to Home Screen" need a service worker (public/sw.js).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
