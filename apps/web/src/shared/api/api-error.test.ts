import { describe, expect, it } from 'vitest';
import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { normalizeApiError } from './api-error';

describe('normalizeApiError', () => {
  it('keeps the API error code and request id', async () => {
    const client = axios.create();
    const mock = new AxiosMockAdapter(client);
    mock.onGet('/failure').reply(401, { success: false, error: { code: 'INVALID_SESSION', message: 'Expired', requestId: 'req-1' } });
    const error = await client.get('/failure').catch((reason: unknown) => normalizeApiError(reason));
    expect(error).toMatchObject({ code: 'INVALID_SESSION', status: 401, requestId: 'req-1' });
  });
});
