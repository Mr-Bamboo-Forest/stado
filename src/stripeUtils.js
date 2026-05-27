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
 * Initialize Stripe payment session
 * Calls Vercel Serverless Function to create checkout session
 * @param {string} userId - User ID
 * @param {string} tierId - 'priority' or 'regular'
 * @returns {Promise<{sessionId: string}>}
 */
export const initializePaymentSession = async (userId, tierId) => {
  try {
    // Connect directly to your new Vercel backend route
    const response = await fetch('/api/createCheckoutSession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tierId: tierId,
        userId: userId,
        userEmail: "player@stado.app" // Fallback data parameter placeholder
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      return {
        sessionId: data.sessionId,
        success: true,
      };
    } else {
      throw new Error(data.error || 'Failed to create checkout session');
    }
  } catch (error) {
    console.error('Payment session error:', error);
    throw error;
  }
};

/**
 * Start Stripe checkout for a subscription
 * Redirects user to Stripe Checkout
 * @param {string} userId - User ID
 * @param {string} tierId - 'priority' or 'regular'
 * @returns {Promise<void>}
 */
export const startCheckout = async (userId, tierId) => {
  try {
    // Get checkout session token from Vercel
    const { sessionId } = await initializePaymentSession(userId, tierId);
    
    // Get Stripe library component instance
    const stripe = await getStripe();
    
    if (!stripe) {
      throw new Error('Failed to load Stripe SDK bundle');
    }
    
    // FORCES THE ACTUAL BROWSER REDIRECT
    const { error } = await stripe.redirectToCheckout({ sessionId });
    
    if (error) {
      console.error('Stripe redirect error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Checkout error:', error);
    throw error;
  }
};

/**
 * Upgrade membership
 */
export const upgradeMembership = async (userId, targetTier) => {
  return startCheckout(userId, targetTier);
};

/**
 * Cancel membership with confirmation
 */
export const cancelMembership = async (userId) => {
  const confirmed = window.confirm(
    'Are you sure you want to cancel your membership? You\'ll lose access to premium features at the end of your billing period.'
  );
  
  if (!confirmed) {
    return { success: false, cancelled: false };
  }
  
  return cancelSubscriptionRequest(userId);
};

/**
 * Placeholder for future cancel cancellation functions
 */
async function cancelSubscriptionRequest(userId) {
  try {
    console.log('Subscription cancellation would be processed for:', userId);
    return {
      success: true,
      message: 'Cancellation request sent. You will lose access at the end of your billing period.',
    };
  } catch (error) {
    console.error('Cancellation error:', error);
    throw error;
  }
}

/**
 * Open Stripe Customer Portal
 */
export const openBillingPortal = async (userId) => {
  try {
    alert('Billing portal features coming soon. Please contact support for layout changes.');
  } catch (error) {
    console.error('Error opening billing portal:', error);
    throw error;
  }
};

/**
 * Check payment status from Firebase data
 */
export const getPaymentStatus = (userData) => {
  if (!userData?.membership) {
    return {
      isPaid: false,
      status: 'free',
      expiresAt: null,
      tier: 'free',
    };
  }

  const { tier, expiresAt, stripeCustomerId, status } = userData.membership;
  const today = new Date();
  const isExpired = expiresAt && new Date(expiresAt) < today;

  return {
    isPaid: tier !== 'free' && !isExpired,
    status: isExpired ? 'expired' : status || 'active',
    tier: tier || 'free',
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    stripeCustomerId,
    isExpired,
  };
};

/**
 * Validate license
 */
export const isValidLicense = (userData) => {
  if (!userData?.membership) return true;

  const { tier, expiresAt } = userData.membership;
  if (tier === 'free') return true;
  if (!expiresAt) return false;
  
  return new Date() < new Date(expiresAt);
};

/**
 * Format price for display in AUD
 */
export const formatPrice = (price) => {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(price);
};

export const getBillingInterval = (interval = 'month') => {
  return interval === 'month' ? 'per month' : 'per year';
};
