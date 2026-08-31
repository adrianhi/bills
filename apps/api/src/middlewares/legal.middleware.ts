import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';
import { appContainer } from '../app-container';

export async function requireCurrentLegalAcceptance(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    if (!req.auth?.user) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
    if (!(await appContainer.legalService.hasCurrentRequired(req.auth.user.id))) {
      throw new AppError(428, 'LEGAL_ACCEPTANCE_REQUIRED', 'Accept the current terms and privacy policy.');
    }
    next();
  } catch (error) {
    next(error);
  }
}
