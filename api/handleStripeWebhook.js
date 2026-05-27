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

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoiceFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).send('Webhook processing failed');
  }
}

async function handleCheckoutComplete(session) {
  const userId = session.metadata?.firebaseUid;
  const planId = session.metadata?.planId;

  if (!userId) return;

  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  const periodEnd = new Date(subscription.current_period_end * 1000);

  await admin.firestore().collection('users').doc(userId).update({
    subscriptionPlan: planId,
    subscriptionStatus: 'active',
    stripeSubscriptionId: session.subscription,
    stripeCustomerId: session.customer,
    currentPeriodEnd: admin.firestore.Timestamp.fromDate(periodEnd),
    monthlyPostsUsed: 0,
  });

  console.log(`Checkout complete: ${userId} -> ${planId}`);
}

async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;
  const userQuery = await admin.firestore()
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (userQuery.empty) return;

  const userId = userQuery.docs[0].id;
  const planId = getPriceToPlan(subscription.items.data[0].price.id);
  const periodEnd = new Date(subscription.current_period_end * 1000);
  const status = subscription.status === 'active' ? 'active' : subscription.status;

  await admin.firestore().collection('users').doc(userId).update({
    subscriptionPlan: planId,
    subscriptionStatus: status,
    currentPeriodEnd: admin.firestore.Timestamp.fromDate(periodEnd),
  });

  console.log(`Subscription updated: ${userId} -> ${planId} (${status})`);
}

async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;
  const userQuery = await admin.firestore()
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (userQuery.empty) return;

  const userId = userQuery.docs[0].id;

  await admin.firestore().collection('users').doc(userId).update({
    subscriptionPlan: 'free',
    subscriptionStatus: 'cancelled',
  });

  console.log(`Subscription cancelled: ${userId}`);
}

async function handleInvoicePaid(invoice) {
  if (!invoice.subscription) return;

  const customerId = invoice.customer;
  const userQuery = await admin.firestore()
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (userQuery.empty) return;

  const userId = userQuery.docs[0].id;

  // Reset monthly posts on successful payment
  await admin.firestore().collection('users').doc(userId).update({
    monthlyPostsUsed: 0,
  });

  console.log(`Invoice paid, posts reset: ${userId}`);
}

async function handleInvoiceFailed(invoice) {
  const customerId = invoice.customer;
  const userQuery = await admin.firestore()
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (userQuery.empty) return;

  const userId = userQuery.docs[0].id;

  await admin.firestore().collection('users').doc(userId).update({
    subscriptionStatus: 'past_due',
  });

  console.log(`Payment failed: ${userId}`);
}

function getPriceToPlan(priceId) {
  const priceMap = {
    [process.env.STRIPE_PRICE_REGULAR]: 'regular',
    [process.env.STRIPE_PRICE_PRO]: 'pro',
  };
  return priceMap[priceId] || 'free';
}
