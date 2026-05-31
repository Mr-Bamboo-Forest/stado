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
  api: { bodyParser: false },
};

async function getRawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Safely convert a Unix epoch seconds value to a Firestore Timestamp.
 * Returns null if the value is missing or not a finite number — Firestore
 * accepts null for optional timestamp fields without throwing.
 */
function toTimestamp(epochSeconds) {
  if (epochSeconds == null || !isFinite(epochSeconds)) return null;
  return admin.firestore.Timestamp.fromMillis(Math.floor(epochSeconds) * 1000);
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
    return res.status(400).send('Webhook Error: Invalid signature');
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.trial_will_end':
        await handleTrialEndingWarning(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).send('Webhook processing failed');
  }
}

async function handleCheckoutCompleted(session) {
  if (session.mode !== 'subscription') return;

  const customerId = session.customer;
  const tierId = session.metadata?.tierId;
  const userId = session.metadata?.firebaseUid;

  if (!userId || !tierId) {
    console.error('checkout.session.completed: missing metadata', { userId, tierId });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription);

  await admin.firestore().collection('users').doc(userId).update({
    'membership.tier': tierId,
    'membership.stripeSubscriptionId': subscription.id,
    'membership.stripeCustomerId': customerId,
    'membership.expiresAt': toTimestamp(subscription.current_period_end),
    'membership.status': 'active',
    'membership.currentPeriodStart': toTimestamp(subscription.current_period_start),
    'membership.currentPeriodEnd': toTimestamp(subscription.current_period_end),
    'membership.billingInterval': session.metadata?.billingInterval || 'monthly',
    monthlyPostsUsed: 0,
    lastPostsResetDate: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Checkout completed: user ${userId} upgraded to ${tierId}`);
}

async function handleSubscriptionCreated(subscription) {
  const customer = await stripe.customers.retrieve(subscription.customer);
  const userId = customer.metadata?.firebaseUid;

  if (!userId) {
    console.error('No Firebase UID found for customer:', subscription.customer);
    return;
  }

  const tier = getPriceToTier(subscription.items.data[0]?.price?.id);

  await admin.firestore().collection('users').doc(userId).update({
    'membership.tier': tier,
    'membership.stripeSubscriptionId': subscription.id,
    'membership.stripeCustomerId': subscription.customer,
    'membership.expiresAt': toTimestamp(subscription.current_period_end),
    'membership.status': 'active',
    'membership.currentPeriodStart': toTimestamp(subscription.current_period_start),
    'membership.currentPeriodEnd': toTimestamp(subscription.current_period_end),
    monthlyPostsUsed: 0,
    lastPostsResetDate: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Subscription created for user ${userId}, tier: ${tier}`);
}

async function handleSubscriptionUpdated(subscription) {
  const customer = await stripe.customers.retrieve(subscription.customer);
  const userId = customer.metadata?.firebaseUid;

  if (!userId) {
    console.error('No Firebase UID found for customer:', subscription.customer);
    return;
  }

  const tier = getPriceToTier(subscription.items.data[0]?.price?.id);
  const appStatus = subscription.status === 'active' ? 'active' : 'inactive';

  await admin.firestore().collection('users').doc(userId).update({
    'membership.tier': tier,
    'membership.stripeSubscriptionId': subscription.id,
    'membership.expiresAt': toTimestamp(subscription.current_period_end),
    'membership.status': appStatus,
    'membership.currentPeriodStart': toTimestamp(subscription.current_period_start),
    'membership.currentPeriodEnd': toTimestamp(subscription.current_period_end),
    'membership.updated': admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Subscription updated for user ${userId}, tier: ${tier}, status: ${appStatus}`);
}

async function handleSubscriptionDeleted(subscription) {
  const customer = await stripe.customers.retrieve(subscription.customer);
  const userId = customer.metadata?.firebaseUid;

  if (!userId) {
    console.error('No Firebase UID found for customer:', subscription.customer);
    return;
  }

  await admin.firestore().collection('users').doc(userId).update({
    'membership.tier': 'free',
    'membership.status': 'cancelled',
    'membership.expiresAt': null,
    'membership.stripeSubscriptionId': null,
    'membership.cancelledAt': admin.firestore.FieldValue.serverTimestamp(),
    'membership.lastSubscriptionId': subscription.id,
  });

  console.log(`Subscription cancelled for user ${userId}`);
}

async function handlePaymentSucceeded(invoice) {
  if (!invoice.subscription) return;

  const customer = await stripe.customers.retrieve(invoice.customer);
  const userId = customer.metadata?.firebaseUid;

  if (!userId) {
    console.error('No Firebase UID found for customer:', invoice.customer);
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);

  await admin.firestore().collection('users').doc(userId).update({
    'membership.expiresAt': toTimestamp(subscription.current_period_end),
    'membership.currentPeriodEnd': toTimestamp(subscription.current_period_end),
    'membership.status': 'active',
    'membership.lastPaymentDate': admin.firestore.FieldValue.serverTimestamp(),
    monthlyPostsUsed: 0,
    lastPostsResetDate: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Payment succeeded for user ${userId}`);
}

async function handlePaymentFailed(invoice) {
  const customer = await stripe.customers.retrieve(invoice.customer);
  const userId = customer.metadata?.firebaseUid;

  if (!userId) {
    console.error('No Firebase UID found for customer:', invoice.customer);
    return;
  }

  await admin.firestore().collection('users').doc(userId).update({
    'membership.status': 'past_due',
    'membership.lastPaymentFailed': admin.firestore.FieldValue.serverTimestamp(),
    'membership.paymentFailureReason': invoice.last_finalization_error?.message || 'Unknown',
  });

  console.warn(`Payment failed for user ${userId}`);
}

async function handleTrialEndingWarning(subscription) {
  const customer = await stripe.customers.retrieve(subscription.customer);
  const userId = customer.metadata?.firebaseUid;
  if (!userId) return;
  console.log(`Trial ending soon for user ${userId}`);
}

function getPriceToTier(priceId) {
  const priceMap = {
    [process.env.STRIPE_PRICE_PLUS_MONTHLY]:  'plus',
    [process.env.STRIPE_PRICE_PLUS_YEARLY]:   'plus',
    [process.env.STRIPE_PRICE_MAX_MONTHLY]:   'max',
    [process.env.STRIPE_PRICE_MAX_YEARLY]:    'max',
    [process.env.STRIPE_PRICE_ULTRA_MONTHLY]: 'ultra',
    [process.env.STRIPE_PRICE_ULTRA_YEARLY]:  'ultra',
  };
  const tier = priceMap[priceId];
  if (!tier) {
    console.error(`getPriceToTier: unrecognised price ID ${priceId}`);
    return 'free';
  }
  return tier;
}