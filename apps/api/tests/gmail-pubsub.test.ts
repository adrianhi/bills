import { describe, expect, it } from 'vitest';
import { AppError } from '../src/errors/app-error';
import { decodeGmailPush } from '../src/controllers/gmail-pubsub.controller';

describe('Gmail Pub/Sub envelope', () => {
  it('decodes the Gmail notification payload', () => {
    const data = Buffer.from(JSON.stringify({
      emailAddress: 'User@Example.com',
      historyId: '123456',
    })).toString('base64');
    expect(decodeGmailPush({ message: { data, messageId: 'pubsub-1' } })).toEqual({
      emailAddress: 'user@example.com',
      historyId: '123456',
      messageId: 'pubsub-1',
    });
  });

  it('rejects malformed notifications before enqueueing work', () => {
    expect(() => decodeGmailPush({ message: { data: 'not-json', messageId: '1' } }))
      .toThrowError(AppError);
  });
});
