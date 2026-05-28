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

/**
 * Vercel Serverless API Route: Create Stripe Checkout Session
 * Called from React application via standard HTTP POST fetch request
 */
export default async function handler(req, res) {
  // 1. Enforce strict HTTP POST request validation
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { tierId, userId, userEmail } = req.body;

    // 2. Validate authentication variables passed from your React layer
    if (!userId || !userEmail) {
      return res.status(401).json({ success: false, error: 'Unauthenticated. Must be logged in.' });
    }

    // 3. Enforce strict tier selection filtering
    if (!['priority', 'regular'].includes(tierId)) {
      return res.status(400).json({ success: false, error: 'Invalid tier ID parameter.' });
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
    const priceIds = {
      priority: process.env.STRIPE_PRICE_PRIORITY,
      regular: process.env.STRIPE_PRICE_REGULAR,
    };

    if (!priceIds[tierId]) {
      return res.status(500).json({ success: false, error: 'Price ID configuration attributes missing.' });
    }

    // 6. Generate secure Stripe checkout transaction session bounds
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
      success_url: `${process.env.APP_URL || 'https://vercel.app'}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'https://vercel.app'}/?payment=cancelled`,
      metadata: {
        firebaseUid: userId,
        tierId: tierId,
      },
    });

    // 7. Deliver payment transaction session references straight back to your client hook
    return res.status(200).json({
      sessionId: session.id,
      success: true,
    });

  } catch (error) {
    console.error('Checkout session creation error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create checkout session. Please try again.' 
    })
  }
}
