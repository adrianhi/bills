import { QueryClient } from '@tanstack/react-query';
import { ApiClientError } from '@/shared/api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      retry(failureCount, error) {
        if (error instanceof ApiClientError && error.status && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});
