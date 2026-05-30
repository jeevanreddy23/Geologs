const DIRECT_DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';

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
  const gatewayApiKey =
    process.env.AI_GATEWAY_API_KEY ||
    process.env.VERCEL_AI_GATEWAY_API_KEY ||
    process.env.VERCEL_OIDC_TOKEN;
  const apiKey = deepseekApiKey || gatewayApiKey;
  const upstreamUrl = gatewayApiKey ? AI_GATEWAY_URL : DIRECT_DEEPSEEK_URL;

  const body = request.body || {};
  const model =
    body.model ||
    process.env.DEEPSEEK_MODEL ||
    process.env.AI_GATEWAY_MODEL ||
    (gatewayApiKey ? 'deepseek/deepseek-chat' : 'deepseek-chat');
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (!apiKey) {
    return response.status(500).json({
      error: 'DeepSeek is not configured. Set DEEPSEEK_API_KEY for direct DeepSeek or AI_GATEWAY_API_KEY for Vercel AI Gateway.',
    });
  }

  if (messages.length === 0) {
    return response.status(400).json({ error: 'messages must be a non-empty array' });
  }

  const upstream = await fetch(upstreamUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
