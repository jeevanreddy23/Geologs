const DIRECT_DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';

export default async function handler(request, response) {
  try {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return response.status(405).json({ error: 'Method not allowed' });
    }

    const configuredApiKey = process.env.AUTOSOIL_API_KEY;
    const requestApiKey = request.headers['x-autosoil-api-key'];
    if (configuredApiKey && requestApiKey !== configuredApiKey) {
      return response.status(401).json({ error: 'Invalid AutoSoil API key' });
    }

    const directDeepseekApiKey =
      process.env.DEEPSEEK_API_KEY ||
      process.env.DEEPSEEK_API ||
      process.env.DEEPSEEK_TOKEN ||
      process.env.DEEPSEEK ||
      process.env.DEEPSEEK_KEY ||
      process.env.VITE_DEEPSEEK_API_KEY ||
      process.env.VITE_DEEPSEEK_API ||
      process.env.VITE_DEEPSEEK_TOKEN ||
      process.env.VITE_DEEPSEEK ||
      process.env.VITE_DEEPSEEK_KEY;
    const gatewayApiKey =
      process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_AI_GATEWAY_API_KEY ||
      process.env.VITE_AI_GATEWAY_API_KEY ||
      process.env.VITE_VERCEL_AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN;

    const body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (!directDeepseekApiKey && !gatewayApiKey) {
      return response.status(500).json({
        error: 'DeepSeek is not configured. Set DEEPSEEK_API_KEY for direct DeepSeek or AI_GATEWAY_API_KEY for Vercel AI Gateway.',
      });
    }

    if (messages.length === 0) {
      return response.status(400).json({ error: 'messages must be a non-empty array' });
    }

    const gatewayModel = body.model || process.env.AI_GATEWAY_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek/deepseek-v4-flash';
    const directModel = body.model?.includes('/') ? 'deepseek-chat' : body.model || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    const attempts = [];

    if (gatewayApiKey) {
      attempts.push({
        name: 'vercel-ai-gateway',
        url: AI_GATEWAY_URL,
        apiKey: gatewayApiKey,
        model: gatewayModel,
      });
      attempts.push({
        name: 'direct-deepseek-from-gateway-key',
        url: DIRECT_DEEPSEEK_URL,
        apiKey: gatewayApiKey,
        model: directModel,
      });
    }

    if (directDeepseekApiKey) {
      attempts.push({
        name: 'direct-deepseek',
        url: DIRECT_DEEPSEEK_URL,
        apiKey: directDeepseekApiKey,
        model: directModel,
      });
    }

    const failures = [];
    for (const attempt of attempts) {
      const upstream = await fetch(attempt.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${attempt.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: attempt.model,
          messages,
          temperature: body.temperature ?? 0.1,
          response_format: body.response_format,
          stream: false,
        }),
      });

      const text = await upstream.text();
      if (upstream.ok) {
        response.status(upstream.status);
        response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
        return response.send(text);
      }

      failures.push({
        provider: attempt.name,
        status: upstream.status,
        body: text.slice(0, 500),
      });
    }

    return response.status(502).json({
      error: 'DeepSeek upstream request failed',
      failures,
    });
  } catch (error) {
    return response.status(500).json({ error: 'DeepSeek proxy failed', message: error?.message || String(error) });
  }
}
