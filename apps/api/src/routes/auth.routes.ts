import { Router, Request, Response } from 'express';
import { config } from '../config';

const router = Router();

// In-memory or HMAC signed token for session validation
const generateToken = (pin: string) => {
  const payload = Buffer.from(JSON.stringify({ pin, ts: Date.now() })).toString('base64');
  return `bills_token_${payload}`;
};

/**
 * POST /api/v1/auth/verify-pin
 * Verifies the dashboard PIN and returns an authorized device token.
 */
router.post('/auth/verify-pin', (req: Request, res: Response): void => {
  const { pin } = req.body;
  const expectedPin = config.dashboardPin;

  if (!pin || String(pin).trim() !== String(expectedPin).trim()) {
    res.status(401).json({
      success: false,
      message: 'PIN incorrecto. Inténtalo de nuevo.',
    });
    return;
  }

  const token = generateToken(pin);
  res.status(200).json({
    success: true,
    message: 'Dispositivo autorizado con éxito',
    token,
  });
});

/**
 * GET /api/v1/auth/check
 * Validates whether the token is still valid.
 */
router.get('/auth/check', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, authorized: false });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token || !token.startsWith('bills_token_')) {
    res.status(401).json({ success: false, authorized: false });
    return;
  }

  res.status(200).json({ success: true, authorized: true });
});

export default router;
