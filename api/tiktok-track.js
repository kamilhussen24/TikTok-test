// api/tiktok-track.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== TIKTOK API TRACK CALLED ===');
  console.log('Timestamp:', new Date().toISOString());

  const { eventId, eventName, customData = {}, userData = {} } = req.body;

  console.log('Request body:', JSON.stringify({ eventId, eventName, customData, userData }, null, 2));

  if (!eventName) {
    console.log('Error: eventName is required');
    return res.status(400).json({ error: 'eventName is required' });
  }

  const TIKTOK_PIXEL_ID = process.env.TIKTOK_PIXEL_ID;
  const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;

  if (!TIKTOK_PIXEL_ID || !TIKTOK_ACCESS_TOKEN) {
    console.error('Error: Missing environment variables - TIKTOK_PIXEL_ID:', !!TIKTOK_PIXEL_ID, 'TIKTOK_ACCESS_TOKEN:', !!TIKTOK_ACCESS_TOKEN);
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';
  const referer = req.headers.referer || '';

  console.log('Client IP:', clientIp);
  console.log('User Agent:', userAgent);
  console.log('Referer:', referer);

  const eventPayload = {
    event_id: eventId || `${eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
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

  console.log('Sending to TikTok:', JSON.stringify({
    url: apiUrl,
    eventId: eventPayload.event_id,
    eventName: eventName,
    hasTtp: !!userData.ttp,
    hasTtclid: !!userData.ttclid
  }, null, 2));

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

    const responseText = await response.text();
    let result;

    try {
      result = JSON.parse(responseText);
    } catch (e) {
      result = { error: 'Invalid JSON response', rawResponse: responseText };
    }

    console.log('TikTok Response:', JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      result: result
    }, null, 2));

    console.log('=== TIKTOK API TRACK COMPLETED ===');

    if (!response.ok) {
      return res.status(response.status).json({ error: result });
    }

    return res.status(200).json({ success: true, result: result });
  } catch (error) {
    console.error('Exception:', error.message);
    console.error(error.stack);
    return res.status(500).json({ error: error.message });
  }
}
