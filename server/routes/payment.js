const express   = require('express');
const router    = express.Router();
const { Cashfree } = require('cashfree-pg');

Cashfree.XClientId     = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment  = process.env.CASHFREE_ENV === 'PRODUCTION'
  ? 'production'
  : 'sandbox';

const CF_VERSION = '2023-08-01';

// ── POST /api/payment/create-order ───────────────────────────────────────────
router.post('/create-order', async (req, res) => {
  const { name, mobile } = req.body;
  if (!name || !mobile) {
    return res.status(400).json({ success: false, message: 'Name and mobile are required.' });
  }

  const orderId = `order_${Date.now()}_${mobile.slice(-4)}`;

  const orderRequest = {
    order_id:       orderId,
    order_amount:   1000,
    order_currency: 'INR',
    customer_details: {
      customer_id:    mobile,
      customer_name:  name,
      customer_phone: mobile,
    },
    order_meta: {
      return_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/form`,
    },
  };

  try {
    const response = await Cashfree.PGCreateOrder(CF_VERSION, orderRequest);
    res.json({
      success:          true,
      orderId:          response.data.order_id,
      paymentSessionId: response.data.payment_session_id,
    });
  } catch (err) {
    console.error('Cashfree create-order error:', err?.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Failed to create payment order.' });
  }
});

// ── POST /api/payment/verify ─────────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ success: false, message: 'Order ID is required.' });
  }

  try {
    const response = await Cashfree.PGFetchOrder(CF_VERSION, orderId);
    const order    = response.data;
    res.json({
      success: true,
      paid:    order.order_status === 'PAID',
      status:  order.order_status,
      orderId: order.order_id,
    });
  } catch (err) {
    console.error('Cashfree verify error:', err?.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Failed to verify payment.' });
  }
});

module.exports = router;
