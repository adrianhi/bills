import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

const AcceptSchema = z.object({
  documents: z.array(z.object({
    type: z.enum(['TERMS', 'PRIVACY', 'GOOGLE_API_DISCLOSURE', 'DATA_DELETION']),
    version: z.string().min(1).max(50),
  })).min(2),
  source: z.enum(['SIGNUP', 'RECONSENT', 'SETTINGS']).default('SIGNUP'),
  locale: z.string().default('es-DO'),
});

interface LegalOperations {
  current(profileId?: string): Promise<unknown>;
  accept(
    profileId: string,
    documents: Array<{ type: 'TERMS' | 'PRIVACY' | 'GOOGLE_API_DISCLOSURE' | 'DATA_DELETION'; version: string }>,
    metadata: { ip?: string; userAgent?: string; source: 'SIGNUP' | 'RECONSENT' | 'SETTINGS'; locale: string }
  ): Promise<unknown>;
}

export class LegalController {
  public constructor(private readonly legal: LegalOperations) {}

  public current = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({ success: true, data: await this.legal.current(req.auth?.user.id) });
    } catch (error) {
      next(error);
    }
  };

  public accept = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = AcceptSchema.parse(req.body);
      const forwardedFor = req.headers['x-forwarded-for'];
      const ip = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : req.ip;
      const data = await this.legal.accept(req.auth!.user.id, input.documents, {
        ip,
        userAgent: req.headers['user-agent'],
        source: input.source,
        locale: input.locale,
      });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}
