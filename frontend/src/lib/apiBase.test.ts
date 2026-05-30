import assert from 'node:assert/strict';
import { resolveApiBase } from './apiBase';

const railwayBase = 'https://autosoil-api-production.up.railway.app/api/v1';

assert.equal(
  resolveApiBase({
    envBase: 'https://auto-soil-logger.vercel.app/api/v1',
    isLocalHost: false,
  }),
  railwayBase,
);

assert.equal(
  resolveApiBase({
    envBase: 'https://auto-soil-logger-git-main-poreddyjeevanreddy-7784s-projects.vercel.app/api/v1',
    isLocalHost: false,
  }),
  railwayBase,
);

assert.equal(
  resolveApiBase({
    envBase: '/api/v1',
    isLocalHost: false,
  }),
  railwayBase,
);

assert.equal(
  resolveApiBase({
    envBase: 'https://example-api.internal/api/v1',
    isLocalHost: false,
  }),
  'https://example-api.internal/api/v1',
);

assert.equal(
  resolveApiBase({
    envBase: '',
    isLocalHost: true,
  }),
  'http://localhost:8000/api/v1',
);
