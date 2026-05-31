import { useState, useEffect } from 'react'
import { 
  MEMBERSHIP_TIERS, 
  getUserTier, 
  getEffectiveTier,
  isMembershipActive, 
  getDaysRemaining,
  getMembershipStatusText,
  canPostGame 
} from '../membershipUtils'
import { upgradeMembership, cancelMembership, openBillingPortal } from '../stripeUtils'

const TIER_FEATURES = {
  free: [
    'Join any game',
    'MAX 3 posts per month',
    'Personal profile',
    'Push notifications',
  ],
  plus: [
    'Join any game',
    'MAX 6 posts per month',
    'Personal profile',
    'Push notifications',
    'Plus Reputation Badge',
  ],
  max: [
    'Join any game',
    'MAX 10 posts per month',
    'Personal profile',
    'Push notifications',
    'Max Reputation Badge',
  ],
  ultra: [
    'Join any game',
    'Unlimited posts per month',
    'Personal profile',
    'Push notifications',
    'Ultra Reputation Badge',
    'Set up weekly recurring games',
    'Special pin colour for posts on map in discover',
    'Posts higher on list in discover',
    'Put into monthly lucky draw for prizes',
  ],
}

const TIER_ACCENT = {
  free: '#888780',
  plus: '#1D9E75',
  max: '#1a7fc1',
  ultra: '#8b5cf6',
}

export default function Membership({ onBack, userData, currentUser, onUpdateUser, onRequireAuth }) {
  const [billingInterval, setBillingInterval] = useState('monthly')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectedTier, setSelectedTier] = useState(null)
  const [loading, setLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [error, setError] = useState('')
  const [stripeLoaded, setStripeLoaded] = useState(false)

  const currentTier = getEffectiveTier(userData)
  const rawTier = getUserTier(userData)
  const isActive = isMembershipActive(userData)
  const daysRemaining = getDaysRemaining(userData)
  const postStatus = canPostGame(userData)

  // Check if Stripe is loaded
  useEffect(() => {
    const checkStripe = async () => {
      try {
        const { loadStripe } = await import('@stripe/stripe-js')
        if (loadStripe && import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
          setStripeLoaded(true)
        }
      } catch (err) {
        console.warn('Stripe not available:', err)
      }
    }
    checkStripe()
  }, [])

  const handleUpgrade = async (tierId) => {
    if (currentUser?.isAnonymous) {
      onRequireAuth && onRequireAuth()
      return
    }
    if (!stripeLoaded) {
      setError('Stripe is not available. Please refresh the page.')
      return
    }
    setSelectedTier(tierId)
    setShowUpgradeModal(true)
    setError('')
  }

  const confirmUpgrade = async () => {
    if (!selectedTier || selectedTier === 'free') return

    setPaymentLoading(true)
    setError('')
    try {
      // Get a fresh ID token to send as a Bearer token
      const idToken = await currentUser.getIdToken()

      const response = await fetch('/api/createCheckoutSession', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          tierId: selectedTier,
          billingInterval,
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to start payment processing.')
      }

      if (data.sessionId) {
        const { loadStripe } = await import('@stripe/stripe-js')
        const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
        await stripe.redirectToCheckout({ sessionId: data.sessionId })
      } else {
        throw new Error('No checkout session returned.')
      }
    } catch (err) {
      console.error('Upgrade error:', err)
      setError(err.message || 'Failed to start payment. Please try again.')
      setPaymentLoading(false)
    }
  }

  const handleCancel = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const result = await cancelMembership(currentUser.uid)
      if (result?.success) {
        setError(result.message || 'Cancellation requested. Your access continues until the end of the billing period.')
      }
    } catch (err) {
      console.error('Cancel membership error:', err)
      setError(err.message || 'Unable to cancel right now. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    try {
      await openBillingPortal(currentUser.uid)
    } catch (err) {
      console.error('Billing portal error:', err)
      setError('Billing portal is temporarily unavailable.')
    }
  }

  const getPrice = (tier) => {
    if (tier.monthlyPrice === 0) return null
    return billingInterval === 'yearly' ? tier.yearlyPrice : tier.monthlyPrice
  }

  const getPriceLabel = (tier) => {
    if (tier.monthlyPrice === 0) return 'Free'
    const price = getPrice(tier)
    const suffix = billingInterval === 'yearly' ? '/year' : '/month'
    return `$${price.toFixed(2)}${suffix}`
  }

  const tiers = Object.values(MEMBERSHIP_TIERS)

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2C2C2A" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span style={styles.headerTitle}>Membership</span>
        <div style={styles.headerSpacer} />
      </header>

      <div style={styles.content}>
        {/* Current Status */}
        <div style={styles.statusCard}>
          <div style={styles.statusContent}>
            <p style={styles.statusLabel}>Current plan</p>
            <h2 style={styles.statusTier}>{currentTier.name}</h2>
            <p style={styles.statusSubtext}>{getMembershipStatusText(userData)}</p>
            {isActive && rawTier.id !== 'free' && currentTier.id !== 'free' && daysRemaining > 0 && (
              <div style={styles.renewalInfo}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
                <span>Renews in {daysRemaining} days</span>
              </div>
            )}
          </div>
          {currentTier.id !== 'free' && (
            <button style={styles.manageBillingBtn} onClick={handleManageBilling}>
              Manage billing
            </button>
          )}
        </div>

        {/* Usage Stats */}
        {currentTier.id !== 'free' && (
          <div style={styles.usageCard}>
            <p style={styles.sectionLabel}>This month's usage</p>
            <div style={styles.usageRow}>
              <div>
                <p style={styles.usageValue}>{postStatus.postsUsed}/{postStatus.postsLimit === Infinity ? '∞' : postStatus.postsLimit}</p>
                <p style={styles.usageLabel}>Games posted</p>
              </div>
              {postStatus.postsLimit !== Infinity && (
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${Math.min(100, (postStatus.postsUsed / postStatus.postsLimit) * 100)}%`
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Billing Interval Toggle */}
        <div style={styles.toggleContainer}>
          <button
            style={{
              ...styles.toggleBtn,
              ...(billingInterval === 'monthly' ? styles.toggleBtnActive : {}),
            }}
            onClick={() => setBillingInterval('monthly')}
          >
            Monthly
          </button>
          <button
            style={{
              ...styles.toggleBtn,
              ...(billingInterval === 'yearly' ? styles.toggleBtnActive : {}),
            }}
            onClick={() => setBillingInterval('yearly')}
          >
            Yearly
            <span style={{
              ...styles.savingsBadge,
              ...(billingInterval === 'yearly' ? styles.savingsBadgeActive : {}),
            }}>
              16% off
            </span>
          </button>
        </div>

        {/* Pricing Tiers */}
        <div style={styles.tiersContainer}>
          {tiers.map((tier) => {
            const isCurrent = tier.id === currentTier.id
            const accent = TIER_ACCENT[tier.id]
            const features = TIER_FEATURES[tier.id] || []

            return (
              <div
                key={tier.id}
                style={{
                  ...styles.tierCard,
                  ...(isCurrent ? { borderColor: accent, borderWidth: '2px' } : {}),
                  ...(tier.id === 'ultra' ? { borderTopWidth: '4px', borderTopColor: accent } : {}),
                }}
              >
                {/* Tier header */}
                <div style={styles.tierHeader}>
                  <div style={styles.tierTitleRow}>
                    <h3 style={{ ...styles.tierName, color: accent }}>{tier.name}</h3>
                    {isCurrent && (
                      <span style={{ ...styles.currentBadge, background: accent }}>CURRENT</span>
                    )}
                    {tier.id === 'ultra' && !isCurrent && (
                      <span style={{ ...styles.popularBadge, background: accent }}>BEST VALUE</span>
                    )}
                  </div>
                  <p style={styles.tierPrice}>{getPriceLabel(tier)}</p>
                  {tier.monthlyPrice > 0 && billingInterval === 'yearly' && (
                    <p style={styles.tierPriceMonthly}>
                      ${(tier.yearlyPrice / 12).toFixed(2)}/month billed annually
                    </p>
                  )}
                  {tier.monthlyPrice > 0 && billingInterval === 'monthly' && (
                    <p style={styles.tierPriceMonthly}>
                      or ${tier.yearlyPrice.toFixed(2)}/year (16% saving)
                    </p>
                  )}
                </div>

                {/* Feature list */}
                <ul style={styles.featureList}>
                  {features.map((feat, i) => (
                    <li key={i} style={styles.featureItem}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: '1px' }}>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span style={styles.featureText}>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* Action button */}
                {isCurrent ? (
                  <button style={{ ...styles.buttonDisabled }} disabled>
                    Your current plan
                  </button>
                ) : tier.id === 'free' ? (
                  <button
                    style={styles.buttonSecondary}
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Downgrade to free'}
                  </button>
                ) : (
                  <button
                    style={{ ...styles.buttonPrimary, background: accent }}
                    onClick={() => handleUpgrade(tier.id)}
                    disabled={paymentLoading}
                  >
                    {paymentLoading ? 'Processing...' : `Get ${tier.name}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Cancel section for paid users */}
        {currentTier.id !== 'free' && (
          <div style={styles.cancelCard}>
            <p style={styles.cancelTitle}>Want to cancel?</p>
            <p style={styles.cancelText}>
              You'll keep premium access until the end of your billing period.
            </p>
            <button
              style={styles.cancelBtn}
              onClick={handleCancel}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Cancel membership'}
            </button>
          </div>
        )}

        {error && <p style={styles.error}>{error}</p>}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              Upgrade to {MEMBERSHIP_TIERS[selectedTier?.toUpperCase()]?.name}
            </h3>

            <p style={styles.modalText}>
              {billingInterval === 'yearly'
                ? `$${MEMBERSHIP_TIERS[selectedTier?.toUpperCase()]?.yearlyPrice.toFixed(2)}/year (16% saving)`
                : `$${MEMBERSHIP_TIERS[selectedTier?.toUpperCase()]?.monthlyPrice.toFixed(2)}/month`}
            </p>

            <ul style={styles.modalList}>
              {(TIER_FEATURES[selectedTier] || []).map((feat, i) => (
                <li key={i}>✓ {feat}</li>
              ))}
            </ul>

            <p style={styles.modalSmallText}>
              Your subscription will auto-renew. You can cancel anytime from your profile.
            </p>

            {error && <p style={styles.modalError}>{error}</p>}

            <div style={styles.modalButtons}>
              <button
                style={styles.modalCancel}
                onClick={() => {
                  if (!paymentLoading) {
                    setShowUpgradeModal(false)
                    setError('')
                  }
                }}
                disabled={paymentLoading}
              >
                Cancel
              </button>
              <button
                style={{
                  ...styles.modalConfirm,
                  background: TIER_ACCENT[selectedTier] || '#1D9E75',
                  opacity: paymentLoading ? 0.7 : 1,
                }}
                onClick={confirmUpgrade}
                disabled={paymentLoading}
              >
                {paymentLoading ? 'Processing...' : 'Continue to payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  screen: { flex: 1, display: 'flex', flexDirection: 'column', background: '#F1EFE8', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'white', borderBottom: '1px solid #E0DDD5', flexShrink: 0 },
  backBtn: { width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', background: 'none', border: 'none', cursor: 'pointer' },
  headerTitle: { fontSize: '16px', fontWeight: '600', color: '#2C2C2A' },
  headerSpacer: { width: '40px' },
  content: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' },

  statusCard: { background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #E0DDD5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' },
  statusContent: { flex: 1 },
  statusLabel: { fontSize: '12px', fontWeight: '600', color: '#7A7A72', textTransform: 'uppercase', margin: 0, marginBottom: '4px' },
  statusTier: { fontSize: '24px', fontWeight: '700', color: '#2C2C2A', margin: 0, marginBottom: '4px' },
  statusSubtext: { fontSize: '13px', color: '#7A7A72', margin: 0, marginBottom: '12px' },
  renewalInfo: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#1D9E75', fontWeight: '600' },
  manageBillingBtn: { padding: '10px 16px', background: '#F1EFE8', border: '1px solid #E0DDD5', borderRadius: '10px', fontSize: '13px', fontWeight: '600', color: '#2C2C2A', cursor: 'pointer' },

  usageCard: { background: 'white', borderRadius: '16px', padding: '16px', border: '1px solid #E0DDD5' },
  sectionLabel: { fontSize: '12px', fontWeight: '600', color: '#888780', textTransform: 'uppercase', margin: 0, marginBottom: '12px', letterSpacing: '0.4px' },
  usageRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' },
  usageValue: { fontSize: '22px', fontWeight: '700', color: '#2C2C2A', margin: 0 },
  usageLabel: { fontSize: '12px', color: '#7A7A72', margin: 0 },
  progressBar: { flex: 1, height: '8px', background: '#E0DDD5', borderRadius: '100px', overflow: 'hidden' },
  progressFill: { height: '100%', background: '#1D9E75', borderRadius: '100px', transition: 'width 0.3s ease' },

  toggleContainer: { display: 'flex', background: 'white', borderRadius: '12px', padding: '4px', border: '1px solid #E0DDD5', gap: '4px' },
  toggleBtn: { flex: 1, padding: '10px 0', border: 'none', borderRadius: '9px', background: 'transparent', fontSize: '14px', fontWeight: '600', color: '#888780', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s ease' },
  toggleBtnActive: { background: '#2C2C2A', color: 'white' },
  savingsBadge: { fontSize: '11px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', background: '#E0DDD5', color: '#888780', transition: 'all 0.15s ease' },
  savingsBadgeActive: { background: '#1D9E75', color: 'white' },

  tiersContainer: { display: 'flex', flexDirection: 'column', gap: '12px' },
  tierCard: { background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #E0DDD5', display: 'flex', flexDirection: 'column', gap: '14px' },
  tierHeader: { display: 'flex', flexDirection: 'column', gap: '4px' },
  tierTitleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  tierName: { fontSize: '20px', fontWeight: '700', margin: 0 },
  currentBadge: { color: 'white', fontSize: '10px', fontWeight: '700', padding: '3px 9px', borderRadius: '6px', letterSpacing: '0.5px' },
  popularBadge: { color: 'white', fontSize: '10px', fontWeight: '700', padding: '3px 9px', borderRadius: '6px', letterSpacing: '0.5px' },
  tierPrice: { fontSize: '22px', fontWeight: '700', color: '#2C2C2A', margin: 0 },
  tierPriceMonthly: { fontSize: '12px', color: '#888780', margin: 0 },

  featureList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' },
  featureItem: { display: 'flex', alignItems: 'flex-start', gap: '10px' },
  featureText: { fontSize: '13px', color: '#555550', lineHeight: '1.4' },

  buttonPrimary: { width: '100%', padding: '12px 0', color: 'white', fontSize: '15px', fontWeight: '600', borderRadius: '10px', border: 'none', cursor: 'pointer', marginTop: '4px' },
  buttonSecondary: { width: '100%', padding: '12px 0', background: '#F1EFE8', color: '#2C2C2A', fontSize: '15px', fontWeight: '600', borderRadius: '10px', border: '1px solid #E0DDD5', cursor: 'pointer', marginTop: '4px' },
  buttonDisabled: { width: '100%', padding: '12px 0', background: '#E0DDD5', color: '#888780', fontSize: '15px', fontWeight: '600', borderRadius: '10px', border: 'none', cursor: 'not-allowed', opacity: 0.6, marginTop: '4px' },

  cancelCard: { background: '#FCEBEB', borderRadius: '12px', padding: '16px', border: '1px solid #E0A0A0' },
  cancelTitle: { fontSize: '14px', fontWeight: '600', color: '#A02020', margin: '0 0 6px 0' },
  cancelText: { fontSize: '13px', color: '#555550', margin: '0 0 12px 0', lineHeight: '1.5' },
  cancelBtn: { padding: '10px 16px', background: 'white', border: '1px solid #E0A0A0', borderRadius: '10px', fontSize: '13px', fontWeight: '600', color: '#A02020', cursor: 'pointer' },

  error: { fontSize: '13px', color: '#D63D3D', background: '#FCEBEB', padding: '10px 12px', borderRadius: '8px', textAlign: 'center', margin: 0 },

  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1000 },
  modal: { background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '340px' },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#2C2C2A', margin: 0, marginBottom: '8px' },
  modalText: { fontSize: '15px', fontWeight: '600', color: '#2C2C2A', margin: '0 0 16px 0' },
  modalList: { margin: '0 0 16px 0', paddingLeft: '4px', fontSize: '13px', color: '#555550', lineHeight: '2', listStyle: 'none' },
  modalSmallText: { fontSize: '12px', color: '#7A7A72', textAlign: 'center', margin: '16px 0', fontStyle: 'italic' },
  modalError: { fontSize: '13px', color: '#D63D3D', background: '#FCEBEB', padding: '8px 10px', borderRadius: '6px', margin: '12px 0' },
  modalButtons: { display: 'flex', gap: '12px' },
  modalCancel: { flex: 1, padding: '12px', background: 'white', color: '#555550', fontSize: '15px', fontWeight: '600', borderRadius: '10px', border: '1px solid #E0DDD5', cursor: 'pointer' },
  modalConfirm: { flex: 1, padding: '12px', color: 'white', fontSize: '15px', fontWeight: '600', borderRadius: '10px', border: 'none', cursor: 'pointer' },
}