export const PRODUCTION_API_BASE = 'https://autosoil-api-production.up.railway.app/api/v1';
export const LOCAL_API_BASE = 'http://localhost:8000/api/v1';

type ResolveApiBaseOptions = {
  envBase?: string;
  isLocalHost: boolean;
};

function isFrontendVercelUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname.endsWith('.vercel.app') && hostname.includes('auto-soil-logger');
  } catch {
    return false;
  }
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export function resolveApiBase({ envBase, isLocalHost }: ResolveApiBaseOptions): string {
  const configuredBase = (envBase || '').trim();
  const selectedBase =
    configuredBase && isAbsoluteHttpUrl(configuredBase) && !isFrontendVercelUrl(configuredBase)
      ? configuredBase
      : isLocalHost
        ? LOCAL_API_BASE
        : PRODUCTION_API_BASE;

  return selectedBase.replace(/\/+$/, '');
}
