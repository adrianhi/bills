import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { appContainer } from '../app-container';
import { AppError } from '../errors/app-error';

let authClient: SupabaseClient | null = null;

function getAuthClient(): SupabaseClient {
  if (!config.supabaseUrl || !config.supabasePublishableKey) {
    throw new AppError(
      503,
      'AUTH_NOT_CONFIGURED',
      'Supabase Auth is not configured on this environment.'
    );
  }

  authClient ||= createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return authClient;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (config.nodeEnv === 'test' && req.headers['x-test-user-id']) {
      req.auth = {
        user: {
          id: String(req.headers['x-test-user-id']),
          email: String(req.headers['x-test-user-email'] || 'test@bills.local').toLowerCase(),
          displayName: String(req.headers['x-test-user-name'] || 'Test User'),
        },
      };
      next();
      return;
    }

    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
    }

    const { data, error } = await getAuthClient().auth.getClaims(token);
    const claims = data?.claims;
    if (error || !claims?.sub || typeof claims.email !== 'string') {
      throw new AppError(401, 'INVALID_SESSION', 'The session is invalid or expired.');
    }

    req.auth = {
      user: {
        id: claims.sub,
        email: claims.email.toLowerCase(),
        displayName:
          typeof claims.user_metadata === 'object' && claims.user_metadata
            ? String((claims.user_metadata as Record<string, unknown>).full_name || '') || undefined
            : undefined,
      },
    };
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireWorkspace(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.auth?.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
    }

    const requestedWorkspaceId = req.headers['x-workspace-id'];
    const membership = await appContainer.workspaceService.findMembership(
      req.auth.user.id,
      typeof requestedWorkspaceId === 'string' ? requestedWorkspaceId : undefined
    );

    if (!membership) {
      throw new AppError(403, 'WORKSPACE_REQUIRED', 'Complete account setup before continuing.');
    }

    req.auth.workspaceId = membership.workspaceId;
    req.auth.role = membership.role;
    next();
  } catch (error) {
    next(error);
  }
}
