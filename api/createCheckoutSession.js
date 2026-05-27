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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { tierId, userId, userEmail } = req.body;

    if (!userId || !userEmail) {
      return res.status(401).json({ success: false, error: 'Unauthenticated' });
    }

    if (!['regular', 'pro'].includes(tierId)) {
      return res.status(400).json({ success: false, error: 'Invalid plan' });
    }

    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    let customerId = userDoc.data()?.stripeCustomerId;

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
        stripeCustomerId: customerId,
      });
    }

    const priceIds = {
      regular: process.env.STRIPE_PRICE_REGULAR,
      pro: process.env.STRIPE_PRICE_PRO,
    };

    if (!priceIds[tierId]) {
      return res.status(500).json({ success: false, error: 'Price ID not configured' });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceIds[tierId],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      billing_address_collection: 'auto',
      success_url: `${process.env.APP_URL || 'https://stado.app'}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'https://stado.app'}/?payment=cancelled`,
      metadata: {
        firebaseUid: userId,
        planId: tierId,
      },
    });

    return res.status(200).json({
      sessionId: session.id,
      success: true,
    });

  } catch (error) {
    console.error('Checkout session error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
