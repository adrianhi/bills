import axios from 'axios';
import { normalizeApiError } from './api-error';

type TokenProvider = () => string | null | Promise<string | null>;
type UnauthorizedHandler = () => void | Promise<void>;

let tokenProvider: TokenProvider = () => null;
let unauthorizedHandler: UnauthorizedHandler | undefined;

export function configureHttpAuth(options: {
  getToken: TokenProvider;
  onUnauthorized?: UnauthorizedHandler;
}) {
  tokenProvider = options.getToken;
  unauthorizedHandler = options.onUnauthorized;
}

export const httpClient = axios.create({
  baseURL: '/api/v1',
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});

httpClient.interceptors.request.use(async (request) => {
  const token = await tokenProvider();
  if (token) request.headers.Authorization = `Bearer ${token}`;
  return request;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const normalized = normalizeApiError(error);
    if (normalized.status === 401) await unauthorizedHandler?.();
    return Promise.reject(normalized);
  },
);
