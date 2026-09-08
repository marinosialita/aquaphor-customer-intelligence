export const SUPABASE_FUNCTIONS = 'https://wxjwazicluifmsqfvqfn.supabase.co/functions/v1';
export const API_BASE = `${SUPABASE_FUNCTIONS}/aquaphor-api-web`;
export const AI_BASE = `${SUPABASE_FUNCTIONS}/aquaphor-ai-web`;

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export async function askAi(mode: 'chat' | 'email', message: string) {
  const response = await fetch(AI_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, message }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload?.error === 'string' ? payload.error : `AI request failed (${response.status})`);
  }
  return payload as { mode: 'chat' | 'email'; answer: string; records_considered: number; model: string };
}
