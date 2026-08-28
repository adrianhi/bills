import axios from 'axios';
import { apiErrorSchema } from '@bills/contracts';

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly requestId?: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    code = 'REQUEST_FAILED',
    status?: number,
    requestId?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.details = details;
  }
}

export function normalizeApiError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error;
  if (axios.isAxiosError(error)) {
    const parsed = apiErrorSchema.safeParse(error.response?.data);
    if (parsed.success) {
      return new ApiClientError(
        parsed.data.error.message,
        parsed.data.error.code,
        error.response?.status,
        parsed.data.error.requestId,
        parsed.data.error.details,
      );
    }
    if (error.code === 'ERR_CANCELED') {
      return new ApiClientError('La solicitud fue cancelada.', 'REQUEST_CANCELLED');
    }
    return new ApiClientError(
      error.response ? 'El servidor rechazó la solicitud.' : 'No pudimos conectar con el servidor.',
      error.response ? 'HTTP_ERROR' : 'NETWORK_ERROR',
      error.response?.status,
    );
  }
  return new ApiClientError(error instanceof Error ? error.message : 'Ocurrió un error inesperado.');
}
