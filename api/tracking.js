const https = require('https');

function apiRequest(path, token, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.17track.net',
      path: path,
      method: 'POST',
      headers: {
        '17token': token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch {} }
  const { trackingNumber } = body || {};
  const key = process.env.TRACK17_API_KEY;

  if (!key) return res.status(500).json({ error: 'TRACK17_API_KEY not configured' });
  if (!trackingNumber) return res.status(400).json({ error: 'Missing tracking number' });

  try {
    // Register
    await apiRequest('/track/v2.4/register', key, [{ number: trackingNumber }]);

    // Wait for processing
    await new Promise(r => setTimeout(r, 3000));

    // Get info
    const data = await apiRequest('/track/v2.4/gettrackinfo', key, [{ number: trackingNumber }]);
    const info = data?.data?.[0]?.tracking;

    if (!info) return res.json({ status: 'NotFound', events: [], trackingNumber });

    const status = info.latest_status?.status || 'NotFound';
    const events = [];
    for (const p of info.providers || [])
      for (const e of p.events || [])
        events.push({ time: e.time_utc || e.time_raw || '', loc: e.location || '', desc: e.description || '' });
    events.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({ status, events, trackingNumber });
  } catch (e) {
    res.status(500).json({ error: 'Tracking error: ' + e.message });
  }
};
