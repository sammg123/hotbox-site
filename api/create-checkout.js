const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const {
      companyName,
      budgetPerDay,
      durationDays,
      totalCost,
      postType,
      audienceSize,
      geoEnabled,
      geoLocation,
      userId,
    } = req.body;

    if (!totalCost || totalCost < 1) {
      return res.status(400).json({ error: 'Invalid total cost' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `HotBox Promotion — ${companyName}`,
              description: `${postType} ad · $${budgetPerDay}/day × ${durationDays} days · ${geoEnabled ? geoLocation || 'Geo-targeted' : 'Entire App'} · ${audienceSize.toLocaleString()} audience`,
            },
            unit_amount: Math.round(totalCost * 100), // cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin || 'https://hotboxteam.com'}/promote?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'https://hotboxteam.com'}/promote?status=cancelled`,
      metadata: {
        userId,
        companyName,
        budgetPerDay: String(budgetPerDay),
        durationDays: String(durationDays),
        postType,
        audienceSize: String(audienceSize),
        geoEnabled: String(geoEnabled),
        geoLocation: geoLocation || '',
      },
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: err.message });
  }
};
