import type { Request } from 'express';
import { AppError } from '../../errors/app-error';

export interface AuthenticatedActor { userId: string; email: string; workspaceId: string; role?: string }
export interface RequestContext { requestId: string; actor: AuthenticatedActor }

export function requestContext(req: Request): RequestContext {
  if (!req.auth?.user || !req.auth.workspaceId) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  return {
    requestId: req.requestId || 'unknown',
    actor: { userId: req.auth.user.id, email: req.auth.user.email, workspaceId: req.auth.workspaceId, role: req.auth.role },
  };
}
