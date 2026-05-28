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
      console.error('Webhook signature verification failed:', err.message)
      return res.status(400).send('Webhook Error: Invalid signature')
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
  console.log(`Checkout completed for customer ${session.customer}, session ${session.id}`);
}

async function handleSubscriptionCreated(subscription) {
  const customerId = subscription.customer;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = customer.metadata?.firebaseUid;

  if (!userId) {
    console.error('No Firebase UID found for customer:', customerId);
    return;
  }

  const tier = getPriceToTier(subscription.items.data[0].price.id);
  const expiresAt = new Date(subscription.current_period_end * 1000);

  await admin.firestore().collection('users').doc(userId).update({
    'membership.tier': tier,
    'membership.stripeSubscriptionId': subscription.id,
    'membership.stripeCustomerId': customerId,
    'membership.expiresAt': expiresAt,
    'membership.status': 'active',
    'membership.currentPeriodStart': new Date(subscription.current_period_start * 1000),
    'membership.currentPeriodEnd': expiresAt,
    monthlyPostsUsed: 0,
    lastPostsResetDate: new Date(),
  });

  console.log(`Subscription created for user ${userId}, tier: ${tier}`);
}

async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = customer.metadata?.firebaseUid;

  if (!userId) {
    console.error('No Firebase UID found for customer:', customerId);
    return;
  }

  const tier = getPriceToTier(subscription.items.data[0].price.id);
  const expiresAt = new Date(subscription.current_period_end * 1000);
  const appStatus = subscription.status === 'active' ? 'active' : 'inactive';

  await admin.firestore().collection('users').doc(userId).update({
    'membership.tier': tier,
    'membership.stripeSubscriptionId': subscription.id,
    'membership.expiresAt': expiresAt,
    'membership.status': appStatus,
    'membership.currentPeriodStart': new Date(subscription.current_period_start * 1000),
    'membership.currentPeriodEnd': expiresAt,
    'membership.updated': new Date(),
  });

  console.log(`Subscription updated for user ${userId}, new status: ${appStatus}`);
}

async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = customer.metadata?.firebaseUid;

  if (!userId) {
    console.error('No Firebase UID found for customer:', customerId);
    return;
  }

  await admin.firestore().collection('users').doc(userId).update({
    'membership.tier': 'free',
    'membership.status': 'cancelled',
    'membership.expiresAt': null,
    'membership.stripeSubscriptionId': null,
    'membership.cancelledAt': new Date(),
    'membership.lastSubscriptionId': subscription.id,
  });

  console.log(`Subscription cancelled for user ${userId}`);
}

async function handlePaymentSucceeded(invoice) {
  if (!invoice.subscription) return;

  const customerId = invoice.customer;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = customer.metadata?.firebaseUid;

  if (!userId) {
    console.error('No Firebase UID found for customer:', customerId);
    return;
  }

  await admin.firestore().collection('users').doc(userId).update({
    monthlyPostsUsed: 0,
    lastPostsResetDate: new Date(),
    'membership.lastPaymentDate': new Date(),
  });

  console.log(`Payment succeeded for user ${userId}, monthly posts reset`);
}

async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = customer.metadata?.firebaseUid;

  if (!userId) {
    console.error('No Firebase UID found for customer:', customerId);
    return;
  }

  await admin.firestore().collection('users').doc(userId).update({
    'membership.status': 'past_due',
    'membership.lastPaymentFailed': new Date(),
    'membership.paymentFailureReason': invoice.last_finalization_error?.message || 'Unknown',
  });

  console.warn(`Payment failed for user ${userId}`);
}

async function handleTrialEndingWarning(subscription) {
  const customerId = subscription.customer;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = customer.metadata?.firebaseUid;

  if (!userId) return;
  console.log(`Trial ending soon for user ${userId}`);
}

function getPriceToTier(priceId) {
  const priceMap = {
    [process.env.STRIPE_PRICE_PRIORITY]: 'priority',
    [process.env.STRIPE_PRICE_REGULAR]: 'regular',
  };
  return priceMap[priceId] || 'free';
}