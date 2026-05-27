// Membership tier definitions and utilities
export const MEMBERSHIP_TIERS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    monthlyPrice: null,
    features: {
      joinAnyGame: true,
      postsPerMonth: 5,
      basicProfile: true,
      pushNotifications: true,
      priorityJoinQueue: false,
      reputationBadge: false,
      unlimitedPosting: false,
      recurringGames: false,
      priorityListing: false,
      seeJoinedPlayers: false,
      noShowProtection: false,
    },
  },
  PRIORITY: {
    id: 'priority',
    name: 'Priority Member',
    price: 3.99,
    monthlyPrice: 3.99,
    features: {
      joinAnyGame: true,
      postsPerMonth: 5,
      basicProfile: true,
      pushNotifications: true,
      priorityJoinQueue: true,
      reputationBadge: true,
      unlimitedPosting: false,
      recurringGames: false,
      priorityListing: false,
      seeJoinedPlayers: false,
      noShowProtection: false,
    },
  },
  REGULAR: {
    id: 'regular',
    name: 'Regular Member',
    price: 9.99,
    monthlyPrice: 9.99,
    features: {
      joinAnyGame: true,
      postsPerMonth: Infinity,
      basicProfile: true,
      pushNotifications: true,
      priorityJoinQueue: true,
      reputationBadge: true,
      unlimitedPosting: true,
      recurringGames: true,
      priorityListing: true,
      seeJoinedPlayers: true,
      noShowProtection: true,
    },
  },
}

/**
 * Get the user's current membership tier
 * @param {Object} userData - User document from Firebase
 * @returns {Object} Current tier object
 */
export const getUserTier = (userData) => {
  if (!userData?.membership?.tier) {
    return MEMBERSHIP_TIERS.FREE
  }
  return MEMBERSHIP_TIERS[userData.membership.tier.toUpperCase()] || MEMBERSHIP_TIERS.FREE
}

/**
 * Check if membership is still active (hasn't expired)
 * @param {Object} userData - User document from Firebase
 * @returns {boolean}
 */
export const isMembershipActive = (userData) => {
  if (!userData?.membership) return false
  if (userData.membership.tier === 'FREE') return true // Free tier never expires
  
  const expiresAt = userData.membership.expiresAt
  if (!expiresAt) return false
  
  const expireDate = expiresAt instanceof Date ? expiresAt : expiresAt.toDate?.()
  return new Date() < expireDate
}

/**
 * Check if user can post a game
 * @param {Object} userData - User document from Firebase
 * @returns {Object} { canPost: boolean, reason?: string, postsUsed: number, postsRemaining: number }
 */
export const canPostGame = (userData) => {
  const tier = getUserTier(userData)
  const isActive = isMembershipActive(userData)
  
  // If membership exists but expired, treat as free
  const effectiveTier = !isActive && userData?.membership?.tier ? MEMBERSHIP_TIERS.FREE : tier
  
  const postsRemaining = effectiveTier.features.postsPerMonth
  const postsUsed = userData?.monthlyPostsUsed || 0
  
  if (postsRemaining === Infinity) {
    return { canPost: true, postsUsed, postsRemaining: Infinity }
  }
  
  const canPost = postsUsed < postsRemaining
  return {
    canPost,
    postsUsed,
    postsRemaining,
    reason: canPost ? null : `You've reached your ${postsRemaining} games/month limit. Upgrade to post unlimited games.`,
  }
}

/**
 * Check if user has a specific feature
 * @param {Object} userData - User document from Firebase
 * @param {string} featureName - Feature key from tier.features
 * @returns {boolean}
 */
export const hasFeature = (userData, featureName) => {
  const tier = getUserTier(userData)
  const isActive = isMembershipActive(userData)
  
  // If membership expired, use free tier
  if (!isActive && userData?.membership?.tier) {
    return MEMBERSHIP_TIERS.FREE.features[featureName] || false
  }
  
  return tier.features[featureName] || false
}

/**
 * Get days remaining for current membership
 * @param {Object} userData - User document from Firebase
 * @returns {number} Days remaining, or -1 if inactive/free
 */
export const getDaysRemaining = (userData) => {
  if (!userData?.membership || userData.membership.tier === 'FREE') return -1
  if (!isMembershipActive(userData)) return 0
  
  const expiresAt = userData.membership.expiresAt
  const expireDate = expiresAt instanceof Date ? expiresAt : expiresAt.toDate?.()
  const today = new Date()
  const diff = expireDate.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 3600 * 24))
}

/**
 * Format membership status for display
 * @param {Object} userData - User document from Firebase
 * @returns {string}
 */
export const getMembershipStatusText = (userData) => {
  const tier = getUserTier(userData)
  
  if (tier.id === 'free') {
    return 'Free tier'
  }
  
  const isActive = isMembershipActive(userData)
  if (!isActive) {
    return `${tier.name} (expired)`
  }
  
  const daysLeft = getDaysRemaining(userData)
  if (daysLeft > 0) {
    return `${tier.name} • ${daysLeft} days left`
  }
  
  return tier.name
}

/**
 * Reset monthly post counter (should be called by scheduled job on 1st of month)
 * @param {string} userId - User ID
 * @returns {Promise} Firebase update promise
 */
export const resetMonthlyPosts = (userId) => {
  // This will be called by a Cloud Function or scheduled task
  // For now, just return the config needed
  return {
    monthlyPostsUsed: 0,
    lastPostsResetDate: new Date(),
  }
}

/**
 * Get all membership tier options for display
 * @returns {Array} Array of tier objects
 */
export const getAllTiers = () => {
  return [MEMBERSHIP_TIERS.FREE, MEMBERSHIP_TIERS.PRIORITY, MEMBERSHIP_TIERS.REGULAR]
}