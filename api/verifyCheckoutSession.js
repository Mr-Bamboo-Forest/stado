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

function getPriceToTier(priceId) {
  const priceMap = {
    [process.env.STRIPE_PRICE_PRIORITY]: 'priority',
    [process.env.STRIPE_PRICE_REGULAR]: 'regular',
  }
  return priceMap[priceId] || 'free'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

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

    // customer may come back as an expanded object or a plain string ID.
    // firebaseUid is set on both the customer metadata and the session metadata —
    // fall back to the session metadata if the customer object doesn't have it.
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

    if (firebaseUid !== decodedToken.uid) {
      console.warn(`Unauthorized: user ${decodedToken.uid} tried to access session for ${firebaseUid}`)
      return res.status(403).json({ success: false, error: 'Forbidden' })
    }

    if (!subscription.items?.data?.length) {
      return res.status(400).json({ success: false, error: 'Invalid subscription data' })
    }

    // Resolve tier from price ID, fall back to session metadata tierId
    const tier =
      getPriceToTier(subscription.items.data[0].price.id) ||
      checkoutSession.metadata?.tierId ||
      'free'

    const expiresAt = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null
    const status =
      subscription.status === 'active' || subscription.status === 'trialing'
        ? 'active'
        : 'inactive'

    const customerId =
      typeof customer === 'object' ? customer.id : customer

    const userRef = admin.firestore().collection('users').doc(firebaseUid)
    await userRef.update({
      'membership.tier': tier,
      'membership.stripeSubscriptionId': subscription.id,
      'membership.stripeCustomerId': customerId,
      'membership.expiresAt': expiresAt,
      'membership.status': status,
      'membership.currentPeriodStart': subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000)
        : null,
      'membership.currentPeriodEnd': expiresAt,
      'membership.updated': new Date(),
    })

    const userSnap = await userRef.get()
    return res.status(200).json({ success: true, userData: userSnap.exists ? userSnap.data() : null })
  } catch (error) {
    console.error('Stripe session verification failed:', error)
    return res.status(500).json({ success: false, error: error.message || 'Failed to verify Stripe session' })
  }
}