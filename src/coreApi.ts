const FUNCTIONS = 'https://wxjwazicluifmsqfvqfn.supabase.co/functions/v1';
const CORE = `${FUNCTIONS}/aquaphor-core-api`;
const AI = `${FUNCTIONS}/aquaphor-intelligence`;
const PUBLIC_APPLY = `${FUNCTIONS}/aquaphor-public-apply-v2`;

export type ApiOptions = RequestInit & { public?: boolean };

export function getAccessCode(): string {
  return sessionStorage.getItem('aquaphor_testing_access') || '';
}

export function setAccessCode(code: string): void {
  if (code.trim()) sessionStorage.setItem('aquaphor_testing_access', code.trim());
  else sessionStorage.removeItem('aquaphor_testing_access');
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      typeof payload?.error === 'string' ? payload.error : `Request failed (${response.status})`,
    ) as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = payload?.code;
    throw error;
  }
  return payload as T;
}

export async function coreRequest<T>(path: string, init: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (!init.public) headers['x-aquaphor-access'] = getAccessCode();
  const response = await fetch(`${CORE}${path}`, { ...init, headers });
  return parseResponse<T>(response);
}

export async function askIntelligence(mode: 'chat' | 'email', message: string) {
  const response = await fetch(AI, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-aquaphor-access': getAccessCode(),
    },
    body: JSON.stringify({ mode, message }),
  });
  return parseResponse<{
    mode: 'chat' | 'email';
    answer: string;
    model: string;
    requested_model: string;
    records: { clients: number; dossiers: number; tasks: number };
    references: Array<{ type: 'client' | 'task'; id: string; label: string }>;
  }>(response);
}

export async function submitPublicApplication(data: Record<string, unknown>, idempotencyKey: string) {
  const response = await fetch(PUBLIC_APPLY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, idempotencyKey }),
  });
  return parseResponse<{ id: string; clientId: string; duplicate?: boolean }>(response);
}
