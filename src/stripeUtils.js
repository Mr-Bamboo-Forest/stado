const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

let stripePromise = null

const getStripe = async () => {
  if (!stripePromise) {
    const { loadStripe } = await import('@stripe/stripe-js')
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}

/**
 * Create a Stripe checkout session and redirect the user.
 * Used by Membership.jsx via confirmUpgrade().
 *
 * @param {string} userId
 * @param {string} userEmail  - real user email, never a placeholder
 * @param {string} tierId     - 'plus' | 'max' | 'ultra'
 * @param {string} billingInterval - 'monthly' | 'yearly'
 */
export const startCheckout = async (userId, userEmail, tierId, billingInterval = 'monthly') => {
  if (!userEmail || userEmail.includes('placeholder') || userEmail === 'player@stado.app') {
    throw new Error('A valid email address is required to start checkout.')
  }

  const response = await fetch('/api/createCheckoutSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tierId, billingInterval, userId, userEmail }),
  })

  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to create checkout session')
  }

  const stripe = await getStripe()
  if (!stripe) throw new Error('Failed to load Stripe')

  const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId })
  if (error) throw error
}

/**
 * Upgrade membership — thin wrapper used by any screen that imports stripeUtils.
 */
export const upgradeMembership = async (userId, userEmail, tierId, billingInterval = 'monthly') => {
  return startCheckout(userId, userEmail, tierId, billingInterval)
}

/**
 * Cancel membership via API.
 */
export const cancelMembership = async (userId) => {
  const confirmed = window.confirm(
    "Are you sure you want to cancel? You'll keep access until the end of your billing period."
  )
  if (!confirmed) return { success: false, cancelled: false }

  try {
    const response = await fetch('/api/cancelSubscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Cancellation error:', error)
    throw error
  }
}

/**
 * Open Stripe Customer Portal.
 */
export const openBillingPortal = async (userId) => {
  try {
    const response = await fetch('/api/billingPortal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await response.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      throw new Error('No portal URL returned')
    }
  } catch (error) {
    console.error('Error opening billing portal:', error)
    throw error
  }
}

/**
 * Check payment status from Firestore user data.
 */
export const getPaymentStatus = (userData) => {
  if (!userData?.membership) {
    return { isPaid: false, status: 'free', expiresAt: null, tier: 'free' }
  }

  const { tier, expiresAt, stripeCustomerId, status } = userData.membership
  const today = new Date()
  const isExpired = expiresAt && new Date(expiresAt) < today

  return {
    isPaid: tier !== 'free' && !isExpired,
    status: isExpired ? 'expired' : status || 'active',
    tier: tier || 'free',
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    stripeCustomerId,
    isExpired,
  }
}

export const isValidLicense = (userData) => {
  if (!userData?.membership) return true
  const { tier, expiresAt } = userData.membership
  if (tier === 'free') return true
  if (!expiresAt) return false
  return new Date() < new Date(expiresAt)
}

export const formatPrice = (price) => {
  if (price === 0) return 'Free'
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(price)
}

export const getBillingInterval = (interval = 'month') => {
  return interval === 'month' ? 'per month' : 'per year'
}