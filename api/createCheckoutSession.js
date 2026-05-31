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

  // Verify Firebase auth token — don't trust userId from the body
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(token);
  } catch (err) {
    console.error('Checkout session creation error:', error);
    return res.status(500).json({ success: false, error: error.message });  // <-- change this line
  }

  try {
    const { tierId, billingInterval = 'monthly' } = req.body;

    // Use the verified UID from the token, not body
    const userId = decodedToken.uid;
    const userEmail = decodedToken.email;

    if (!userEmail) {
      return res.status(400).json({ success: false, error: 'Account must have a verified email to subscribe.' });
    }
    if (!VALID_TIERS.includes(tierId)) {
      return res.status(400).json({ success: false, error: 'Invalid tier ID.' });
    }
    if (!VALID_INTERVALS.includes(billingInterval)) {
      return res.status(400).json({ success: false, error: 'Invalid billing interval.' });
    }

    // Fetch Firestore user doc
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    let customerId = userDoc.data()?.membership?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          firebaseUid: userId,
          createdAt: new Date().toISOString(),
        },
      });
      customerId = customer.id;

      await admin.firestore().collection('users').doc(userId).update({
        'membership.stripeCustomerId': customerId,
      });
    } else {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted && !customer.metadata?.firebaseUid) {
        await stripe.customers.update(customerId, {
          metadata: { firebaseUid: userId },
        });
      }
    }

    const priceIds = {
      plus:  { monthly: process.env.STRIPE_PRICE_PLUS_MONTHLY,  yearly: process.env.STRIPE_PRICE_PLUS_YEARLY  },
      max:   { monthly: process.env.STRIPE_PRICE_MAX_MONTHLY,   yearly: process.env.STRIPE_PRICE_MAX_YEARLY   },
      ultra: { monthly: process.env.STRIPE_PRICE_ULTRA_MONTHLY, yearly: process.env.STRIPE_PRICE_ULTRA_YEARLY },
    };

    const priceId = priceIds[tierId]?.[billingInterval];
    if (!priceId) {
      return res.status(500).json({ success: false, error: 'Price ID not configured for this tier and interval.' });
    }

    const appUrl = process.env.APP_URL || 'https://stado.football';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      billing_address_collection: 'auto',
      success_url: `${appUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/?payment=cancelled`,
      metadata: {
        firebaseUid: userId,
        tierId,
        billingInterval,
      },
    });

    return res.status(200).json({ sessionId: session.id, success: true });

  } catch (error) {
    console.error('Checkout session creation error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create checkout session. Please try again.' });
  }
}