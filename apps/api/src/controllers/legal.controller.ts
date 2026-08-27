import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { LegalService } from '../services/legal.service';

const AcceptSchema = z.object({
  documents: z
    .array(
      z.object({
        type: z.enum(['TERMS', 'PRIVACY', 'GOOGLE_API_DISCLOSURE', 'DATA_DELETION']),
        version: z.string().min(1).max(50),
      })
    )
    .min(2),
  source: z.enum(['SIGNUP', 'RECONSENT', 'SETTINGS']).default('SIGNUP'),
  locale: z.string().default('es-DO'),
});

export class LegalController {
  public static async current(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({
        success: true,
        data: await LegalService.current(req.auth?.user.id),
      });
    } catch (error) {
      next(error);
    }
  }

  public static async accept(req: Request, res: Response, next: NextFunction) {
    try {
      const input = AcceptSchema.parse(req.body);
      const forwardedFor = req.headers['x-forwarded-for'];
      const ip = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : req.ip;
      const data = await LegalService.accept(req.auth!.user.id, input.documents, {
        ip,
        userAgent: req.headers['user-agent'],
        source: input.source,
        locale: input.locale,
      });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
