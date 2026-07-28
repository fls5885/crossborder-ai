export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { messages, locale } = req.body;
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return res.status(500).json({ error: 'DEEPSEEK_API_KEY not set' });

  const sys = locale === 'zh'
    ? '你是CrossBorder AI，专业的跨境物流和跨境电商AI助手。回答准确专业，给具体数据，用emoji，用Markdown。'
    : 'You are CrossBorder AI, a pro cross-border logistics assistant. Be accurate and actionable. Use emoji and Markdown.';

  try {
    const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: sys }, ...messages], stream: true, max_tokens: 2000, temperature: 0.7 }),
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = r.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    };
    await pump();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
