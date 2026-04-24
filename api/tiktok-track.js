export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== TIKTOK API TRACK CALLED ===');

  const { eventId, eventName, customData = {}, userData = {} } = req.body;

  if (!eventName) {
    return res.status(400).json({ error: 'eventName is required' });
  }

  const TIKTOK_PIXEL_ID = process.env.TIKTOK_PIXEL_ID;
  const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;

  if (!TIKTOK_PIXEL_ID || !TIKTOK_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Missing env variables' });
  }

  // ✅ Clean IP (important)
  const clientIp = (req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim() || req.socket.remoteAddress || '';

  const userAgent = req.headers['user-agent'] || '';
  const referer = req.headers.referer || '';

  // ✅ Correct endpoint
  const apiUrl = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';

  const requestBody = {
    pixel_code: TIKTOK_PIXEL_ID,
    partner_name: 'kdex',
    events: [
      {
        event_id: eventId || `${eventName}_${Date.now()}`,
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        user_data: {
          ip: clientIp,
          user_agent: userAgent,
          ttp: userData.ttp || '',
          ttclid: userData.ttclid || ''
        },
        custom_data: {
          ...customData,
          referer: referer
        }
      }
    ]
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': TIKTOK_ACCESS_TOKEN
      },
      body: JSON.stringify(requestBody)
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    console.log('TikTok Response:', response.status, data);

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    return res.status(200).json({ success: true, data });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
