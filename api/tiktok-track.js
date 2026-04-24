// api/tiktok-track.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { eventId, eventName, customData = {}, userData = {} } = req.body;

  if (!eventName) {
    return res.status(400).json({ error: 'eventName is required' });
  }

  const TIKTOK_PIXEL_ID = process.env.TIKTOK_PIXEL_ID;
  const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;

  if (!TIKTOK_PIXEL_ID || !TIKTOK_ACCESS_TOKEN) {
    console.error('Missing TikTok env vars: TIKTOK_PIXEL_ID, TIKTOK_ACCESS_TOKEN');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';
  const referer = req.headers.referer || '';

  const eventPayload = {
    event_id: eventId,
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
  };

  const apiUrl = `https://business-api.tiktok.com/open_api/v1.3/pixel/${TIKTOK_PIXEL_ID}/event/`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': TIKTOK_ACCESS_TOKEN
      },
      body: JSON.stringify({
        events: [eventPayload],
        partner_name: 'kdex'
      })
    });

    const result = await response.json();

    console.log('=== TIKTOK CAPI EVENT SENT ===');
    console.log(JSON.stringify({
      eventId: eventId,
      eventName: eventName,
      status: response.status,
      statusText: response.statusText,
      result: result,
      timestamp: new Date().toISOString(),
      ip: clientIp,
      userAgent: userAgent,
      hasTtp: !!userData.ttp,
      hasTtclid: !!userData.ttclid
    }, null, 2));

    if (!response.ok) {
      console.error('TikTok CAPI ERROR:', JSON.stringify(result, null, 2));
      return res.status(response.status).json({ error: result });
    }

    return res.status(200).json({ success: true, result: result });
  } catch (error) {
    console.error('TikTok CAPI EXCEPTION:', error.message);
    console.error(error.stack);
    return res.status(500).json({ error: error.message });
  }
}
