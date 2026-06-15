import { resolveApiBase } from './apiBase';

const isBrowser = typeof window !== 'undefined';
const isLocalHost =
  isBrowser &&
  ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

export const API_BASE = resolveApiBase({
  envBase: import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE,
  isLocalHost,
});

export const API_KEY =
  import.meta.env.VITE_AUTOSOIL_API_KEY ||
  import.meta.env.VITE_API_KEY ||
  '';  // no hardcoded fallback — set VITE_AUTOSOIL_API_KEY at build time

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (API_KEY && !headers.has('X-Autosoil-Api-Key')) {
    headers.set('X-Autosoil-Api-Key', API_KEY);
  }
  return fetch(input, { ...init, headers });
}

export async function downloadApiFile(path: string, fileName: string): Promise<void> {
  const response = await apiFetch(apiUrl(path));
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
