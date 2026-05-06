// ══════════════════════════════════════════════
// VK ID OAuth 2.1 — PKCE helpers (браузер)
// ══════════════════════════════════════════════

const STORAGE_KEY = 'l2r_vk_pkce';
const ALLOWED_REDIRECT_URI = 'https://l2realm.ru/auth/callback';

function randomString(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64Url(arr);
}

function base64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(input: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
}

export async function startVkLogin() {
  const clientId    = process.env.NEXT_PUBLIC_VK_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_VK_REDIRECT_URI || ALLOWED_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error('VK OAuth не настроен (проверь NEXT_PUBLIC_VK_CLIENT_ID и NEXT_PUBLIC_VK_REDIRECT_URI)');
  }
  if (redirectUri !== ALLOWED_REDIRECT_URI) {
    throw new Error('VK OAuth redirect_uri должен быть https://l2realm.ru/auth/callback');
  }

  const codeVerifier  = randomString(32);
  const codeChallenge = base64Url(await sha256(codeVerifier));
  const state         = randomString(16);

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ codeVerifier, state, redirectUri }));

  const url = new URL('https://id.vk.com/authorize');
  url.searchParams.set('response_type',         'code');
  url.searchParams.set('client_id',             clientId);
  url.searchParams.set('redirect_uri',          redirectUri);
  url.searchParams.set('state',                 state);
  url.searchParams.set('code_challenge',        codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('scope',                 'email');

  window.location.href = url.toString();
}

export function readVkPkce(): { codeVerifier: string; state: string; redirectUri: string } | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearVkPkce() {
  sessionStorage.removeItem(STORAGE_KEY);
}
