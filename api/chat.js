const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch {} }
  const { messages, locale } = body || {};
  const key = process.env.DEEPSEEK_API_KEY;

  if (!key) return res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured' });
  if (!messages || !messages.length) return res.status(400).json({ error: 'No messages' });

  const sys = locale === 'zh'
    ? '你是CrossBorder AI，专业的跨境物流和跨境电商AI助手。回答准确专业，给具体数据，用emoji，用Markdown。'
    : 'You are CrossBorder AI, a pro cross-border logistics assistant. Be accurate and actionable. Use emoji and Markdown.';

  const payload = JSON.stringify({
    model: 'deepseek-chat',
    messages: [{ role: 'system', content: sys }, ...messages],
    stream: true,
    max_tokens: 2000,
    temperature: 0.7,
  });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  return new Promise((resolve, reject) => {
    const apiReq = https.request({
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (apiRes) => {
      apiRes.on('data', (chunk) => { res.write(chunk); });
      apiRes.on('end', () => { res.end(); resolve(); });
      apiRes.on('error', (e) => { res.end(); reject(e); });
    });

    apiReq.on('error', (e) => {
      res.status(500).json({ error: 'DeepSeek API error: ' + e.message });
      resolve();
    });

    apiReq.write(payload);
    apiReq.end();
  });
};
