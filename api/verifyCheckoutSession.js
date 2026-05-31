import Stripe from 'stripe'
import admin from 'firebase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

/**
 * Maps a Stripe price ID to an app tier ID.
 * Covers all 6 price env vars. Falls back to session metadata tierId,
 * then 'free' if neither resolves.
 */
function getPriceToTier(priceId) {
  const priceMap = {
    [process.env.STRIPE_PRICE_PLUS_MONTHLY]:  'plus',
    [process.env.STRIPE_PRICE_PLUS_YEARLY]:   'plus',
    [process.env.STRIPE_PRICE_MAX_MONTHLY]:   'max',
    [process.env.STRIPE_PRICE_MAX_YEARLY]:    'max',
    [process.env.STRIPE_PRICE_ULTRA_MONTHLY]: 'ultra',
    [process.env.STRIPE_PRICE_ULTRA_YEARLY]:  'ultra',
  }
  const tier = priceMap[priceId]
  if (!tier) {
    console.error(`getPriceToTier: unrecognised price ID ${priceId}`)
  }
  return tier || null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  // Verify Firebase auth token
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const token = authHeader.slice(7)
  let decodedToken
  try {
    decodedToken = await admin.auth().verifyIdToken(token)
  } catch (error) {
    console.error('Token verification failed:', error.message)
    return res.status(401).json({ success: false, error: 'Invalid authentication token' })
  }

  const { sessionId } = req.body || {}
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Missing Stripe session ID' })
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription', 'subscription.items.data.price'],
    })

    const customer = checkoutSession.customer
    const subscription = checkoutSession.subscription

    // Resolve firebaseUid from customer metadata first, fall back to session metadata
    const customerMetaUid =
      typeof customer === 'object' ? customer?.metadata?.firebaseUid : null
    const firebaseUid =
      customerMetaUid || checkoutSession.metadata?.firebaseUid

    if (!firebaseUid || !subscription) {
      console.error('Could not determine firebaseUid for session:', checkoutSession.id, {
        hasCustomer: !!customer,
        customerType: typeof customer,
        sessionMeta: checkoutSession.metadata,
      })
      return res.status(400).json({ success: false, error: 'Invalid checkout session' })
    }

    // Security: ensure the calling user owns this session
    if (firebaseUid !== decodedToken.uid) {
      console.warn(`Unauthorized: user ${decodedToken.uid} tried to access session for ${firebaseUid}`)
      return res.status(403).json({ success: false, error: 'Forbidden' })
    }

    if (!subscription.items?.data?.length) {
      return res.status(400).json({ success: false, error: 'Invalid subscription data' })
    }

    // Resolve tier: price ID map → session metadata tierId → error
    const priceId = subscription.items.data[0].price.id
    const tier =
      getPriceToTier(priceId) ||
      checkoutSession.metadata?.tierId ||
      null

    if (!tier || tier === 'free') {
      console.error(`verifyCheckoutSession: could not resolve paid tier for price ${priceId}, session metadata tierId: ${checkoutSession.metadata?.tierId}`)
      return res.status(400).json({ success: false, error: 'Could not determine membership tier from session' })
    }

    const expiresAt = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null

    const status =
      subscription.status === 'active' || subscription.status === 'trialing'
        ? 'active'
        : 'inactive'

    const customerId =
      typeof customer === 'object' ? customer.id : customer

    const billingInterval = checkoutSession.metadata?.billingInterval || 'monthly'

    const userRef = admin.firestore().collection('users').doc(firebaseUid)
    await userRef.update({
      'membership.tier': tier,
      'membership.stripeSubscriptionId': subscription.id,
      'membership.stripeCustomerId': customerId,
      'membership.expiresAt': expiresAt,
      'membership.status': status,
      'membership.billingInterval': billingInterval,
      'membership.currentPeriodStart': subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000)
        : null,
      'membership.currentPeriodEnd': expiresAt,
      'membership.updated': new Date(),
      monthlyPostsUsed: 0,
      lastPostsResetDate: new Date(),
    })

    console.log(`verifyCheckoutSession: user ${firebaseUid} verified and upgraded to ${tier}`)

    const userSnap = await userRef.get()
    return res.status(200).json({
      success: true,
      tier,
      userData: userSnap.exists ? userSnap.data() : null,
    })
  } catch (error) {
    console.error('Stripe session verification failed:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify Stripe session',
    })
  }
}