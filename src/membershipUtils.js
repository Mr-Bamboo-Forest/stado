/**
 * membershipUtils.js
 *
 * Single source of truth for membership logic on the client.
 *
 * SECURITY RULES:
 *   - The client ONLY reads membership data from Firestore.
 *   - Membership tier and expiry are ONLY written by the Stripe webhook
 *     serverless function (api/stripeWebhook.js). Never write these fields
 *     from the client.
 *   - All feature gates here must be mirrored by Firestore Security Rules
 *     and/or Cloud Functions that re-verify tier server-side before acting.
 */

// ---------------------------------------------------------------------------
// Tier definitions
// ---------------------------------------------------------------------------

export const MEMBERSHIP_TIERS = {
  FREE: {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: {
      joinAnyGame: true,
      postsPerMonth: 3,
      personalProfile: true,
      pushNotifications: true,
      reputationBadge: false,
      recurringGames: false,
      specialPinColour: false,
      priorityListing: false,
      luckyDraw: false,
    },
  },
  PLUS: {
    id: 'plus',
    name: 'Plus',
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    features: {
      joinAnyGame: true,
      postsPerMonth: 6,
      personalProfile: true,
      pushNotifications: true,
      reputationBadge: 'plus',
      recurringGames: false,
      specialPinColour: false,
      priorityListing: false,
      luckyDraw: false,
    },
  },
  MAX: {
    id: 'max',
    name: 'Max',
    monthlyPrice: 24.99,
    yearlyPrice: 249.99,
    features: {
      joinAnyGame: true,
      postsPerMonth: 10,
      personalProfile: true,
      pushNotifications: true,
      reputationBadge: 'max',
      recurringGames: false,
      specialPinColour: false,
      priorityListing: false,
      luckyDraw: false,
    },
  },
  ULTRA: {
    id: 'ultra',
    name: 'Ultra',
    monthlyPrice: 29.99,
    yearlyPrice: 299.99,
    features: {
      joinAnyGame: true,
      postsPerMonth: Infinity,
      personalProfile: true,
      pushNotifications: true,
      reputationBadge: 'ultra',
      recurringGames: true,
      specialPinColour: true,
      priorityListing: true,
      luckyDraw: true,
    },
  },
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Safely coerce a Firestore Timestamp, JS Date, or ISO string to a JS Date.
 * Returns null if value is missing or unparseable.
 */
function toDate(value) {
  if (!value) return null
  // Firestore Timestamp object
  if (typeof value.toDate === 'function') return value.toDate()
  // Already a JS Date
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  // ISO string or epoch number
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the user's current membership tier object.
 * Always returns a valid tier (defaults to FREE).
 */
export const getUserTier = (userData) => {
  const tierKey = userData?.membership?.tier?.toUpperCase()
  return MEMBERSHIP_TIERS[tierKey] ?? MEMBERSHIP_TIERS.FREE
}

/**
 * Check whether the user's paid membership has not yet expired.
 * Free tier is always considered "active" (it never expires).
 * Paid tiers require a valid, future expiresAt timestamp in Firestore.
 */
export const isMembershipActive = (userData) => {
  const tier = getUserTier(userData)

  if (tier.id === 'free') return true

  const expiresAt = toDate(userData?.membership?.expiresAt)
  if (!expiresAt) return false

  return new Date() < expiresAt
}

/**
 * Derive the effective (enforced) tier, accounting for expiry.
 * If a paid membership has lapsed, the user is downgraded to FREE
 * until Stripe renews and the webhook updates Firestore.
 */
export const getEffectiveTier = (userData) => {
  const tier = getUserTier(userData)
  if (tier.id === 'free') return MEMBERSHIP_TIERS.FREE
  return isMembershipActive(userData) ? tier : MEMBERSHIP_TIERS.FREE
}

/**
 * Check whether the user has a specific feature, respecting expiry.
 */
export const hasFeature = (userData, featureName) => {
  const tier = getEffectiveTier(userData)
  return tier.features[featureName] ?? false
}

/**
 * Check whether the user can post a game this month.
 * Returns { canPost, postsUsed, postsRemaining, reason? }
 */
export const canPostGame = (userData) => {
  const tier = getEffectiveTier(userData)
  const postsLimit = tier.features.postsPerMonth
  const postsUsed = userData?.monthlyPostsUsed ?? 0

  if (postsLimit === Infinity) {
    return { canPost: true, postsUsed, postsLimit, postsRemaining: Infinity }
  }

  const canPost = postsUsed < postsLimit
  return {
    canPost,
    postsUsed,
    postsLimit,
    postsRemaining: Math.max(0, postsLimit - postsUsed),
    reason: canPost
      ? null
      : `You've reached your ${postsLimit} games/month limit. Upgrade to post more games.`,
  }
}

/**
 * Get days remaining on the current paid membership.
 * Returns -1 for free tier, 0 if expired.
 */
export const getDaysRemaining = (userData) => {
  const tier = getUserTier(userData)
  if (tier.id === 'free') return -1
  if (!isMembershipActive(userData)) return 0

  const expiresAt = toDate(userData?.membership?.expiresAt)
  if (!expiresAt) return 0

  const diff = expiresAt.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/**
 * Human-readable membership status for UI display.
 */
export const getMembershipStatusText = (userData) => {
  const tier = getUserTier(userData)

  if (tier.id === 'free') return 'Free plan'

  if (!isMembershipActive(userData)) return `${tier.name} (expired)`

  const days = getDaysRemaining(userData)
  if (days > 0) return `${tier.name} · ${days} day${days === 1 ? '' : 's'} left`

  return tier.name
}

/**
 * All tiers as an array, for rendering comparison tables.
 */
export const getAllTiers = () => [
  MEMBERSHIP_TIERS.FREE,
  MEMBERSHIP_TIERS.PLUS,
  MEMBERSHIP_TIERS.MAX,
  MEMBERSHIP_TIERS.ULTRA,
]

/**
 * Stub used by the client to inform the UI of the monthly reset config.
 * Actual reset is performed server-side by a Cloud Function or cron job
 * calling the logic in resetMonthlyPosts.js.
 */
export const resetMonthlyPosts = () => ({
  monthlyPostsUsed: 0,
  lastPostsResetDate: new Date(),
})