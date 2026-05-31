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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { userId } = req.body || {}
  if (!userId) {
    return res.status(400).json({ success: false, error: 'Missing userId' })
  }

  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get()
    const subscriptionId = userDoc.data()?.membership?.stripeSubscriptionId

    if (!subscriptionId) {
      return res.status(400).json({ success: false, error: 'No active subscription found' })
    }

    // Cancel at period end — user keeps access until billing period expires
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })

    await admin.firestore().collection('users').doc(userId).update({
      'membership.cancelAtPeriodEnd': true,
      'membership.cancellationRequestedAt': new Date(),
    })

    return res.status(200).json({
      success: true,
      message: "Cancellation scheduled. You'll keep access until the end of your billing period.",
    })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return res.status(500).json({ success: false, error: error.message || 'Failed to cancel subscription' })
  }
}