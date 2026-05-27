const functions = require('firebase-functions');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }
  
  try {
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
        await handleSubscriptionUpdate(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Webhook processing failed');
  }
});

async function handleSubscriptionUpdate(subscription) {
  const customerId = subscription.customer;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = customer.metadata?.firebaseUid;
  
  if (!userId) return;
  
  // Map price to tier
  const tierMap = {
    'price_1TbevEBZJU5NTqivS1XuyD1X': 'priority',
    'price_1TbevXBZJU5NTqivPOdtLzia': 'regular',
  };
  
  const tier = tierMap[subscription.items.data[0].price.id] || 'free';
  
  await admin.firestore().collection('users').doc(userId).update({
    'membership.tier': tier,
    'membership.stripeSubscriptionId': subscription.id,
    'membership.expiresAt': new Date(subscription.current_period_end * 1000),
    'membership.status': subscription.status === 'active' ? 'active' : 'inactive',
  });
}

async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = customer.metadata?.firebaseUid;
  
  if (!userId) return;
  
  await admin.firestore().collection('users').doc(userId).update({
    'membership.tier': 'free',
    'membership.status': 'cancelled',
  });
}

async function handlePaymentSucceeded(invoice) {
  const customerId = invoice.customer;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = customer.metadata?.firebaseUid;
  
  if (!userId) return;
  
  // Reset monthly posts on renewal
  await admin.firestore().collection('users').doc(userId).update({
    monthlyPostsUsed: 0,
    lastPostsResetDate: new Date(),
  });
}