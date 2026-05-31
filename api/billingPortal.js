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
    const customerId = userDoc.data()?.membership?.stripeCustomerId

    if (!customerId) {
      return res.status(400).json({ success: false, error: 'No Stripe customer found' })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.APP_URL || 'https://stado.football',
    })

    return res.status(200).json({ success: true, url: session.url })
  } catch (error) {
    console.error('Billing portal error:', error)
    return res.status(500).json({ success: false, error: error.message || 'Failed to open billing portal' })
  }
}