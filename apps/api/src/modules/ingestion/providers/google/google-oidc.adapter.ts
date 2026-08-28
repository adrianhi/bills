import { config } from '../../../../config';
import { AppError } from '../../../../errors/app-error';
import { validateGooglePushClaims, type GoogleTokenInfo } from './gmail-push';

export class GoogleOidcAdapter {
  async verify(token: string) {
    if (!config.googlePubSubPushAudience || !config.googlePubSubPushServiceAccount) throw new AppError(503, 'GOOGLE_PUSH_NOT_CONFIGURED', 'Google push authentication is not configured.');
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new AppError(401, 'INVALID_GOOGLE_PUSH_TOKEN', 'Google push token is invalid.');
    validateGooglePushClaims(await response.json() as GoogleTokenInfo);
  }
}
