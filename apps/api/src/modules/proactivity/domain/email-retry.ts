export function decideEmailFailure(input: {
  createdAt: Date; attempts: number; maxAttempts: number; retryable: boolean; ambiguous: boolean; now: Date;
}) {
  const age = input.now.getTime() - input.createdAt.getTime();
  if (input.ambiguous && (age >= 24 * 3_600_000 || input.attempts >= input.maxAttempts)) {
    return { status: 'UNKNOWN' as const, retryAt: null, terminal: true };
  }
  if (!input.retryable || input.attempts >= input.maxAttempts) {
    return { status: 'FAILED' as const, retryAt: null, terminal: true };
  }
  const delays = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000, 6 * 3_600_000];
  return {
    status: 'FAILED' as const,
    retryAt: new Date(input.now.getTime() + delays[Math.min(input.attempts - 1, delays.length - 1)]),
    terminal: false,
  };
}
