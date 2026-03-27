const https = require('https');

/**
 * Sends an SMS via Fast2SMS (https://fast2sms.com).
 * Set FAST2SMS_API_KEY in server/.env to enable.
 * Silently skips if key is not configured.
 */
async function sendSMS(mobile, message) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    console.warn('[SMS] FAST2SMS_API_KEY not set — skipping SMS');
    return;
  }

  const payload = JSON.stringify({
    route:    'q',
    message,
    language: 'english',
    flash:    0,
    numbers:  mobile,
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'www.fast2sms.com',
        path:     '/dev/bulkV2',
        method:   'POST',
        headers:  {
          authorization:   apiKey,
          'Content-Type':  'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            console.log('[SMS] response:', result);
          } catch {
            console.log('[SMS] raw response:', data);
          }
          resolve();
        });
      }
    );
    req.on('error', (err) => {
      console.error('[SMS] error:', err.message);
      resolve();
    });
    req.write(payload);
    req.end();
  });
}

module.exports = { sendSMS };
