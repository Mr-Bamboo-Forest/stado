const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Dynamically load Stripe frontend scripts securely
let stripePromise = null;

const getStripe = async () => {
  if (!stripePromise) {
    const { loadStripe } = await import('@stripe/stripe-js');
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

/**
 * Start Stripe checkout for a subscription
 * @param {string} userId - User ID
 * @param {string} planId - 'regular' or 'pro'
 * @returns {Promise<void>}
 */
export const startCheckout = async (userId, planId, userEmail) => {
  try {
    const response = await fetch('/api/createCheckoutSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tierId: planId,
        userId,
        userEmail: userEmail || 'player@stado.app',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to create checkout session');
    }

    const stripe = await getStripe();
    if (!stripe) {
      throw new Error('Failed to load Stripe');
    }

    const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
    if (error) throw error;
  } catch (error) {
    console.error('Checkout error:', error);
    throw error;
  }
};

/**
 * Open Stripe Customer Portal for managing subscription
 */
export const openBillingPortal = async (userId) => {
  try {
    const response = await fetch('/api/createPortalSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error('Failed to create portal session');
    }
  } catch (error) {
    console.error('Billing portal error:', error);
    throw error;
  }
};

/**
 * Format price for display
 */
export const formatPrice = (price) => {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(price);
};
