import Stripe from 'stripe';
import admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const VALID_TIERS = ['plus', 'max', 'ultra'];
const VALID_INTERVALS = ['monthly', 'yearly'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(token);
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid authentication token: ' + err.message });
  }

  try {
    const { tierId, billingInterval = 'monthly' } = req.body;
    const userId = decodedToken.uid;
    const userEmail = decodedToken.email;

    if (!userEmail) {
      return res.status(400).json({ success: false, error: 'Account must have a verified email to subscribe.' });
    }
    if (!VALID_TIERS.includes(tierId)) {
      return res.status(400).json({ success: false, error: 'Invalid tier: ' + tierId });
    }
    if (!VALID_INTERVALS.includes(billingInterval)) {
      return res.status(400).json({ success: false, error: 'Invalid interval: ' + billingInterval });
    }

    // Check Stripe key is present
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ success: false, error: 'STRIPE_SECRET_KEY env var is missing.' });
    }

    const priceIds = {
      plus:  { monthly: process.env.STRIPE_PRICE_PLUS_MONTHLY,  yearly: process.env.STRIPE_PRICE_PLUS_YEARLY  },
      max:   { monthly: process.env.STRIPE_PRICE_MAX_MONTHLY,   yearly: process.env.STRIPE_PRICE_MAX_YEARLY   },
      ultra: { monthly: process.env.STRIPE_PRICE_ULTRA_MONTHLY, yearly: process.env.STRIPE_PRICE_ULTRA_YEARLY },
    };

    const priceId = priceIds[tierId]?.[billingInterval];
    if (!priceId) {
      return res.status(500).json({
        success: false,
        error: `Missing env var: STRIPE_PRICE_${tierId.toUpperCase()}_${billingInterval.toUpperCase()} is not set in Vercel.`
      });
    }

    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    let customerId = userDoc.data()?.membership?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { firebaseUid: userId },
      });
      customerId = customer.id;
      await admin.firestore().collection('users').doc(userId).update({
        'membership.stripeCustomerId': customerId,
      });
    }

    const appUrl = process.env.APP_URL || 'https://stado.football';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      billing_address_collection: 'auto',
      success_url: `${appUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?payment=cancelled`,
      metadata: { firebaseUid: userId, tierId, billingInterval },
    });

    return res.status(200).json({ sessionId: session.id, success: true });

  } catch (error) {
    console.error('Checkout session error:', error);
    // Return the real error message so you can see what's failing
    return res.status(500).json({ success: false, error: error.message });
  }
}