const express = require('express');
const router  = express.Router();
const https   = require('https');
const { getExpectedAmount } = require('../models/Settings');

const CF_BASE    = 'api.cashfree.com';
const CF_VERSION = '2023-08-01';

function cfRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: CF_BASE,
      path,
      method,
      headers: {
        'x-client-id':     process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-api-version':   CF_VERSION,
        'Content-Type':    'application/json',
      },
    };
    if (payload) options.headers['Content-Length'] = Buffer.byteLength(payload);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject({ status: res.statusCode, data: parsed });
        } catch (e) {
          reject({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── POST /api/payment/create-order ───────────────────────────────────────────
router.post('/create-order', async (req, res) => {
  const { name, mobile } = req.body;
  if (!name || !mobile) {
    return res.status(400).json({ success: false, message: 'Name and mobile are required.' });
  }

  const orderId = `order_${Date.now()}_${mobile.slice(-4)}`;

  try {
    const amount    = await getExpectedAmount();
    // Always use HTTPS for return_url — Cashfree rejects http/local URLs
    const clientUrl = (process.env.CLIENT_URL || 'https://zaltixsoftsolutions.com').replace(/^http:\/\//, 'https://');
    const data = await cfRequest('POST', '/pg/orders', {
      order_id:       orderId,
      order_amount:   amount,
      order_currency: 'INR',
      customer_details: {
        customer_id:    mobile,
        customer_name:  name,
        customer_phone: mobile,
      },
      order_meta: {
        return_url: `${clientUrl}/form/`,
      },
    });

    res.json({
      success:          true,
      orderId:          data.order_id,
      paymentSessionId: data.payment_session_id,
    });
  } catch (err) {
    const cfMsg = err?.data?.message || err?.data || err.message || 'Unknown error';
    console.error('Cashfree create-order error:', cfMsg);
    res.status(500).json({
      success: false,
      message: `Payment order creation failed: ${typeof cfMsg === 'string' ? cfMsg : JSON.stringify(cfMsg)}`,
    });
  }
});

// ── POST /api/payment/verify ─────────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ success: false, message: 'Order ID is required.' });
  }

  try {
    const data = await cfRequest('GET', `/pg/orders/${orderId}`);
    res.json({
      success: true,
      paid:    data.order_status === 'PAID',
      status:  data.order_status,
      orderId: data.order_id,
    });
  } catch (err) {
    console.error('Cashfree verify error:', err?.data || err.message);
    res.status(500).json({ success: false, message: 'Failed to verify payment.' });
  }
});

module.exports = router;
