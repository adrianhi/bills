export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName?: string;
}

export interface AuthContext {
  user: AuthenticatedUser;
  workspaceId?: string;
  role?: 'OWNER' | 'MEMBER';
}
