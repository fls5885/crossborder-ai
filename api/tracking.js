export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { trackingNumber } = req.body;
  const key = process.env.TRACK17_API_KEY;
  if (!key) return res.status(500).json({ error: 'TRACK17_API_KEY not set' });
  if (!trackingNumber) return res.status(400).json({ error: 'Missing tracking number' });

  try {
    // Register
    await fetch('https://api.17track.net/track/v2.4/register', {
      method: 'POST',
      headers: { '17token': key, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ number: trackingNumber }]),
    });

    // Wait for processing
    await new Promise(r => setTimeout(r, 3000));

    // Get info
    const r = await fetch('https://api.17track.net/track/v2.4/gettrackinfo', {
      method: 'POST',
      headers: { '17token': key, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ number: trackingNumber }]),
    });

    const data = await r.json();
    const info = data?.data?.[0]?.tracking;

    if (!info) return res.json({ status: 'NotFound', events: [] });

    const status = info.latest_status?.status || 'NotFound';
    const events = [];
    for (const p of info.providers || [])
      for (const e of p.events || [])
        events.push({ time: e.time_utc || e.time_raw || '', loc: e.location || '', desc: e.description || '' });
    events.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({ status, events, trackingNumber });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
