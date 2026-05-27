import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp } from 'firebase/app';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const functions = getFunctions();

// Dynamically load Stripe
let stripePromise = null;

const getStripe = async () => {
  if (!stripePromise) {
    const { loadStripe } = await import('@stripe/js');
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

/**
 * Initialize Stripe payment session
 * Calls Cloud Function to create checkout session
 * @param {string} userId - User ID
 * @param {string} tierId - 'priority' or 'regular'
 * @returns {Promise<{sessionId: string}>}
 */
export const initializePaymentSession = async (userId, tierId) => {
  try {
    const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
    const response = await createCheckoutSession({ tierId });
    
    if (response.data.success) {
      return {
        sessionId: response.data.sessionId,
        success: true,
      };
    } else {
      throw new Error('Failed to create checkout session');
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
    // Get checkout session
    const { sessionId } = await initializePaymentSession(userId, tierId);
    
    // Get Stripe instance
    const stripe = await getStripe();
    
    if (!stripe) {
      throw new Error('Failed to load Stripe');
    }
    
    // Redirect to Stripe Checkout
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
 * Manage subscription (cancel, portal, etc)
 * For actual implementation, you'd need additional Cloud Functions
 * @param {string} userId - User ID
 * @param {string} action - 'cancel', 'portal', etc
 * @returns {Promise<Object>}
 */
export const manageSubscription = async (userId, action) => {
  try {
    // TODO: Create Cloud Function for subscription management
    // For now, this is a placeholder for future implementation
    
    switch (action) {
      case 'portal':
        return await openBillingPortal(userId);
      case 'cancel':
        return await cancelSubscriptionRequest(userId);
      default:
        throw new Error('Unknown action');
    }
  } catch (error) {
    console.error('Subscription management error:', error);
    throw error;
  }
};

/**
 * Upgrade membership
 * @param {string} userId - User ID
 * @param {string} targetTier - 'priority' or 'regular'
 * @returns {Promise<void>}
 */
export const upgradeMembership = async (userId, targetTier) => {
  return startCheckout(userId, targetTier);
};

/**
 * Cancel membership with confirmation
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
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
 * Request to cancel subscription
 * This would call a Cloud Function in production
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
 */
async function cancelSubscriptionRequest(userId) {
  try {
    // TODO: Implement Cloud Function for cancellation
    // const cancelSubscription = httpsCallable(functions, 'cancelSubscription');
    // const response = await cancelSubscription({ userId });
    // return response.data;
    
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
 * Allows user to manage billing, payment methods, invoices, etc.
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const openBillingPortal = async (userId) => {
  try {
    // TODO: Implement Cloud Function to create portal session
    // const createPortalSession = httpsCallable(functions, 'createBillingPortal');
    // const response = await createPortalSession({ userId });
    // window.location.href = response.data.url;
    
    // For now, direct link (you'll want to implement the Cloud Function)
    alert('Billing portal feature coming soon. Please contact support for billing changes.');
  } catch (error) {
    console.error('Error opening billing portal:', error);
    throw error;
  }
};

/**
 * Check payment status from Firebase data
 * @param {Object} userData - User document
 * @returns {Object} { isPaid, status, expiresAt }
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
 * Validate license (check if subscription is still valid)
 * @param {Object} userData - User document
 * @returns {boolean}
 */
export const isValidLicense = (userData) => {
  if (!userData?.membership) return true; // Free tier is always valid

  const { tier, expiresAt } = userData.membership;
  if (tier === 'free') return true;

  if (!expiresAt) return false;
  
  const expDate = new Date(expiresAt);
  return new Date() < expDate;
};

/**
 * Format price for display
 * @param {number} price - Price in dollars
 * @returns {string}
 */
export const formatPrice = (price) => {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'AUD',
  }).format(price);
};

/**
 * Get billing interval text
 * @param {string} interval - 'month' or 'year'
 * @returns {string}
 */
export const getBillingInterval = (interval = 'month') => {
  const intervals = {
    month: 'per month',
    year: 'per year',
  };
  return intervals[interval] || interval;
};

/**
 * Check if user has a specific feature
 * @param {Object} userData - User document
 * @param {string} featureName - Feature key
 * @returns {boolean}
 */
export const hasFeature = (userData, featureName) => {
  const { MEMBERSHIP_TIERS, isMembershipActive } = require('./membershipUtils');
  const { getUserTier } = require('./membershipUtils');
  
  const tier = getUserTier(userData);
  const isActive = isMembershipActive(userData);
  
  // If membership expired, use free tier
  if (!isActive && userData?.membership?.tier) {
    return MEMBERSHIP_TIERS.FREE.features[featureName] || false;
  }
  
  return tier.features[featureName] || false;
};