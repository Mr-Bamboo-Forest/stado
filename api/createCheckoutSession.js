import Stripe from 'stripe';
import admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Safely initialize Firebase Admin inside a stateless serverless container
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Prevents breaks caused by newline characters in environment variables
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const VALID_TIERS = ['plus', 'max', 'ultra'];
const VALID_INTERVALS = ['monthly', 'yearly'];

/**
 * Vercel Serverless API Route: Create Stripe Checkout Session
 * Called from React application via standard HTTP POST fetch request
 *
 * Expects body: { tierId, billingInterval, userId, userEmail }
 * tierId: 'plus' | 'max' | 'ultra'
 * billingInterval: 'monthly' | 'yearly'
 *
 * Required environment variables:
 *   STRIPE_PRICE_PLUS_MONTHLY
 *   STRIPE_PRICE_PLUS_YEARLY
 *   STRIPE_PRICE_MAX_MONTHLY
 *   STRIPE_PRICE_MAX_YEARLY
 *   STRIPE_PRICE_ULTRA_MONTHLY
 *   STRIPE_PRICE_ULTRA_YEARLY
 */
export default async function handler(req, res) {
  // 1. Enforce strict HTTP POST request validation
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { tierId, billingInterval = 'monthly', userId, userEmail } = req.body;

    // 2. Validate authentication variables passed from your React layer
    if (!userId || !userEmail) {
      return res.status(401).json({ success: false, error: 'Unauthenticated. Must be logged in.' });
    }

    // 3. Enforce strict tier and interval selection filtering
    if (!VALID_TIERS.includes(tierId)) {
      return res.status(400).json({ success: false, error: 'Invalid tier ID parameter.' });
    }

    if (!VALID_INTERVALS.includes(billingInterval)) {
      return res.status(400).json({ success: false, error: 'Invalid billing interval.' });
    }

    // 4. Fetch or generate the corresponding Stripe Customer ID mapping
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

      // Update structural status documents inside Firestore database
      await admin.firestore().collection('users').doc(userId).update({
        'membership.stripeCustomerId': customerId,
      });
    }

    // 5. Gather mapped pricing parameters directly from your dashboard environment
    //    Each tier has a monthly and yearly price ID configured in Vercel env vars.
    const priceIds = {
      plus: {
        monthly: process.env.STRIPE_PRICE_PLUS_MONTHLY,
        yearly: process.env.STRIPE_PRICE_PLUS_YEARLY,
      },
      max: {
        monthly: process.env.STRIPE_PRICE_MAX_MONTHLY,
        yearly: process.env.STRIPE_PRICE_MAX_YEARLY,
      },
      ultra: {
        monthly: process.env.STRIPE_PRICE_ULTRA_MONTHLY,
        yearly: process.env.STRIPE_PRICE_ULTRA_YEARLY,
      },
    };

    const priceId = priceIds[tierId]?.[billingInterval];

    if (!priceId) {
      return res.status(500).json({ success: false, error: 'Price ID configuration missing for this tier and interval.' });
    }

    // 6. Generate secure Stripe checkout transaction session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      billing_address_collection: 'auto',
      success_url: `${process.env.APP_URL || 'https://vercel.app'}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'https://vercel.app'}/?payment=cancelled`,
      metadata: {
        firebaseUid: userId,
        tierId: tierId,
        billingInterval: billingInterval,
      },
    });

    // 7. Deliver payment transaction session references back to the client
    return res.status(200).json({
      sessionId: session.id,
      success: true,
    });

  } catch (error) {
    console.error('Checkout session creation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create checkout session. Please try again.',
    });
  }
}