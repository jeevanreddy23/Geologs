const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const configuredApiKey = process.env.AUTOSOIL_API_KEY;
  const requestApiKey = request.headers['x-autosoil-api-key'];
  if (configuredApiKey && requestApiKey !== configuredApiKey) {
    return response.status(401).json({ error: 'Invalid AutoSoil API key' });
  }

  const deepseekApiKey =
    process.env.DEEPSEEK_API_KEY ||
    process.env.DEEPSEEK_API ||
    process.env.DEEPSEEK_TOKEN ||
    process.env.DEEPSEEK_KEY ||
    process.env.VITE_DEEPSEEK_API_KEY ||
    process.env.VITE_DEEPSEEK_API ||
    process.env.VITE_DEEPSEEK_TOKEN ||
    process.env.VITE_DEEPSEEK_KEY;
  if (!deepseekApiKey) {
    return response.status(500).json({ error: 'DEEPSEEK_API_KEY is not configured in Vercel' });
  }

  const body = request.body || {};
  const model = body.model || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (messages.length === 0) {
    return response.status(400).json({ error: 'messages must be a non-empty array' });
  }

  const upstream = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${deepseekApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: body.temperature ?? 0.1,
      response_format: body.response_format,
      stream: false,
    }),
  });

  const text = await upstream.text();
  response.status(upstream.status);
  response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
  return response.send(text);
}
