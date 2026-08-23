import crypto from 'crypto';
import { config } from '../config';
import { AppError } from '../errors/app-error';

const VERSION = 'v1';

function getKey() {
  const key = Buffer.from(config.ingestionEncryptionKey, 'base64');
  if (key.length !== 32) {
    throw new AppError(
      503,
      'ENCRYPTION_NOT_CONFIGURED',
      'A valid 32-byte INGESTION_ENCRYPTION_KEY is required.'
    );
  }
  return key;
}

export class SecretCryptoService {
  public static encrypt(value: string) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
  }

  public static decrypt(payload: string) {
    const [version, encodedIv, encodedTag, encodedCiphertext] = payload.split('.');
    if (version !== VERSION || !encodedIv || !encodedTag || !encodedCiphertext) {
      throw new AppError(500, 'INVALID_ENCRYPTED_SECRET', 'Stored secret has an invalid format.');
    }
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getKey(),
      Buffer.from(encodedIv, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}
