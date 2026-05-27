const functions = require('firebase-functions');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// 1. ADDED: Essential initialization step to prevent Firestore database crashes
admin.initializeApp();

exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  
  const { tierId } = data;
  const userId = context.auth.uid;
  
  // Get or create Stripe customer
  const userDoc = await admin.firestore().collection('users').doc(userId).get();
  let customerId = userDoc.data()?.membership?.stripeCustomerId;
  
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: context.auth.token.email,
      metadata: { firebaseUid: userId }
    });
    customerId = customer.id;
    
    // Save customer ID
    await admin.firestore().collection('users').doc(userId).update({
      'membership.stripeCustomerId': customerId
    });
  }
  
  // Your Stripe dashboard Price IDs (These look perfect now)
  const priceIds = {
    priority: 'price_1TbevEBZJU5NTqivS1XuyD1X',
    regular: 'price_1TbevXBZJU5NTqivPOdtLzia',
  };
  
  // 2. FIXED: Correct URLs to drop users right back onto your Stado dashboard loop
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{
      price: priceIds[tierId],
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: 'https://vercel.app{CHECKOUT_SESSION_ID}',
    cancel_url: 'https://vercel.app',
  });
  
  return { sessionId: session.id };
});
