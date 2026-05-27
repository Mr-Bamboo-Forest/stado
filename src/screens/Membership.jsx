import { useState, useEffect } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { 
  MEMBERSHIP_TIERS, 
  getUserTier, 
  isMembershipActive, 
  getDaysRemaining,
  getMembershipStatusText,
  canPostGame 
} from '../membershipUtils'
import { upgradeMembership, cancelMembership, openBillingPortal } from '../stripeUtils'

export default function Membership({ onBack, userData, currentUser, onUpdateUser }) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectedTier, setSelectedTier] = useState(null)
  const [loading, setLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [error, setError] = useState('')

  const currentTier = getUserTier(userData)
  const isActive = isMembershipActive(userData)
  const daysRemaining = getDaysRemaining(userData)
  const postStatus = canPostGame(userData)

  const features = [
    { name: 'Join any game', key: 'joinAnyGame' },
    { name: 'Posts per month', key: 'postsPerMonth', format: (v) => v === Infinity ? 'Unlimited' : v },
    { name: 'Basic profile', key: 'basicProfile' },
    { name: 'Push notifications', key: 'pushNotifications' },
    { name: 'Priority join queue', key: 'priorityJoinQueue' },
    { name: 'Reputation badge', key: 'reputationBadge' },
    { name: 'Unlimited posting', key: 'unlimitedPosting' },
    { name: 'Recurring games', key: 'recurringGames' },
    { name: 'Priority listing', key: 'priorityListing' },
    { name: 'See who joined', key: 'seeJoinedPlayers' },
    { name: 'No-show protection', key: 'noShowProtection' },
  ]

  const handleUpgrade = async (tierId) => {
    setSelectedTier(tierId)
    setShowUpgradeModal(true)
  }

  const confirmUpgrade = async () => {
    if (!selectedTier || selectedTier === 'free') return
    
    setPaymentLoading(true)
    setError('')
    try {
      await upgradeMembership(currentUser.uid, selectedTier)
      // In a real implementation, this would redirect to Stripe
      // For now, we'll just show the modal closed
      setShowUpgradeModal(false)
    } catch (err) {
      console.error('Upgrade error:', err)
      setError('Failed to start payment. Please try again.')
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleCancel = async () => {
    try {
      setLoading(true)
      await cancelMembership(currentUser.uid)
      alert('Membership cancelled. You\'ll have access until the end of your billing period.')
      onBack()
    } catch (err) {
      console.error('Cancel error:', err)
      setError('Failed to cancel membership.')
    } finally {
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    try {
      await openBillingPortal(currentUser.uid)
    } catch (err) {
      console.error('Billing portal error:', err)
      setError('Failed to open billing portal.')
    }
  }

  const renderCheckmark = (hasFeature) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={hasFeature ? '#1D9E75' : '#E0DDD5'} strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2C2C2A" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
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
            <p style={styles.statusSubtext}>
              {getMembershipStatusText(userData)}
            </p>
            {isActive && currentTier.id !== 'free' && daysRemaining > 0 && (
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
                <p style={styles.usageValue}>{postStatus.postsUsed}/{postStatus.postsRemaining === Infinity ? '∞' : postStatus.postsRemaining}</p>
                <p style={styles.usageLabel}>Games posted</p>
              </div>
              {postStatus.postsRemaining !== Infinity && (
                <div style={styles.progressBar}>
                  <div 
                    style={{
                      ...styles.progressFill,
                      width: `${(postStatus.postsUsed / postStatus.postsRemaining) * 100}%`
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pricing Tiers */}
        <div style={styles.tiersSection}>
          <p style={styles.sectionLabel} style={{ marginBottom: '16px' }}>Plans & pricing</p>
          <div style={styles.tiersContainer}>
            {Object.values(MEMBERSHIP_TIERS).map((tier) => {
              const isCurrent = tier.id === currentTier.id
              return (
                <div 
                  key={tier.id}
                  style={{
                    ...styles.tierCard,
                    ...(isCurrent ? styles.tierCardCurrent : {}),
                    ...(!isCurrent && tier.id !== 'free' ? { border: '2px solid #1D9E75', borderBottomWidth: '4px' } : {})
                  }}
                >
                  <div style={styles.tierHeader}>
                    <h3 style={styles.tierName}>{tier.name}</h3>
                    {isCurrent && <span style={styles.currentBadge}>Current</span>}
                  </div>
                  
                  <p style={styles.tierPrice}>
                    {tier.price === 0 ? 'Free forever' : `$${tier.price.toFixed(2)}/month`}
                  </p>

                  <div style={styles.tierFeatures}>
                    {features.map((feature) => {
                      const hasFeature = tier.features[feature.key]
                      const value = tier.features[feature.key]
                      const displayValue = feature.format ? feature.format(value) : (hasFeature ? '✓' : '✗')
                      
                      return (
                        <div key={feature.key} style={styles.featureRow}>
                          {renderCheckmark(hasFeature)}
                          <span style={{ ...styles.featureName, color: hasFeature ? '#2C2C2A' : '#C9C6BC' }}>
                            {feature.name}
                          </span>
                          {feature.format && (
                            <span style={styles.featureValue}>{displayValue}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {isCurrent ? (
                    <button style={styles.buttonDisabled} disabled>
                      Current plan
                    </button>
                  ) : tier.id === 'free' ? (
                    <button style={styles.buttonSecondary} onClick={() => handleCancel()}>
                      Downgrade
                    </button>
                  ) : (
                    <button 
                      style={styles.buttonPrimary} 
                      onClick={() => handleUpgrade(tier.id)}
                      disabled={loading}
                    >
                      Upgrade now
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Info Section */}
        <div style={styles.infoSection}>
          <h4 style={styles.infoTitle}>What's included</h4>
          
          <div style={styles.infoCard}>
            <p style={styles.infoCardTitle}>🎮 Free Tier</p>
            <ul style={styles.infoList}>
              <li>Join any game happening near you</li>
              <li>Post up to 5 games per month</li>
              <li>Basic profile with stats</li>
              <li>Receive push notifications</li>
              <li>Free forever, no credit card needed</li>
            </ul>
          </div>

          <div style={styles.infoCard}>
            <p style={styles.infoCardTitle}>⭐ Priority Member</p>
            <ul style={styles.infoList}>
              <li>Everything in Free</li>
              <li>Priority join queue when games fill fast</li>
              <li>Reputation badge to show reliability</li>
              <li>Only $3.99/month</li>
            </ul>
          </div>

          <div style={styles.infoCard}>
            <p style={styles.infoCardTitle}>👑 Regular Member</p>
            <ul style={styles.infoList}>
              <li>Everything in Priority</li>
              <li>Unlimited game posting</li>
              <li>Schedule recurring games</li>
              <li>Premium listing on map</li>
              <li>See who joined before confirming</li>
              <li>No-show protection features</li>
              <li>Only $9.99/month</li>
            </ul>
          </div>
        </div>

        {/* Error Message */}
        {error && <p style={styles.error}>{error}</p>}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              Upgrade to {selectedTier === 'priority' ? 'Priority' : 'Regular'} Member
            </h3>
            
            {selectedTier === 'priority' && (
              <>
                <p style={styles.modalText}>
                  Get priority join queue and reputation badge for <strong>$3.99/month</strong>
                </p>
                <ul style={styles.modalList}>
                  <li>✓ Priority join queue</li>
                  <li>✓ Reputation badge</li>
                  <li>✓ All Free tier features</li>
                </ul>
              </>
            )}

            {selectedTier === 'regular' && (
              <>
                <p style={styles.modalText}>
                  Unlimited posting and premium features for <strong>$9.99/month</strong>
                </p>
                <ul style={styles.modalList}>
                  <li>✓ Unlimited game posting</li>
                  <li>✓ Recurring games</li>
                  <li>✓ Premium map listing</li>
                  <li>✓ No-show protection</li>
                  <li>✓ All Priority features</li>
                </ul>
              </>
            )}

            <p style={styles.modalSmallText}>
              Your subscription will auto-renew each month. You can cancel anytime.
            </p>

            {error && <p style={styles.modalError}>{error}</p>}

            <div style={styles.modalButtons}>
              <button 
                style={styles.modalCancel} 
                onClick={() => setShowUpgradeModal(false)}
                disabled={paymentLoading}
              >
                Cancel
              </button>
              <button 
                style={styles.modalConfirm} 
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

  tiersSection: { marginTop: '8px' },
  tiersContainer: { display: 'flex', flexDirection: 'column', gap: '12px' },
  tierCard: { background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #E0DDD5', display: 'flex', flexDirection: 'column', gap: '16px' },
  tierCardCurrent: { background: '#E1F5EE', borderColor: '#1D9E75' },
  tierHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  tierName: { fontSize: '18px', fontWeight: '700', color: '#2C2C2A', margin: 0 },
  currentBadge: { background: '#1D9E75', color: 'white', fontSize: '11px', fontWeight: '600', padding: '4px 10px', borderRadius: '6px' },
  tierPrice: { fontSize: '16px', fontWeight: '700', color: '#085041', margin: 0 },
  tierFeatures: { display: 'flex', flexDirection: 'column', gap: '10px' },
  featureRow: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '500', color: '#555550' },
  featureName: { flex: 1 },
  featureValue: { fontSize: '13px', fontWeight: '600', color: '#1D9E75' },
  buttonPrimary: { width: '100%', padding: '12px 0', background: '#1D9E75', color: 'white', fontSize: '15px', fontWeight: '600', borderRadius: '10px', border: 'none', cursor: 'pointer' },
  buttonSecondary: { width: '100%', padding: '12px 0', background: '#F1EFE8', color: '#2C2C2A', fontSize: '15px', fontWeight: '600', borderRadius: '10px', border: '1px solid #E0DDD5', cursor: 'pointer' },
  buttonDisabled: { width: '100%', padding: '12px 0', background: '#E0DDD5', color: '#888780', fontSize: '15px', fontWeight: '600', borderRadius: '10px', border: 'none', cursor: 'not-allowed', opacity: 0.6 },

  infoSection: { marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  infoTitle: { fontSize: '16px', fontWeight: '700', color: '#2C2C2A', margin: 0, marginBottom: '8px' },
  infoCard: { background: 'white', borderRadius: '12px', padding: '14px', border: '1px solid #E0DDD5' },
  infoCardTitle: { fontSize: '14px', fontWeight: '600', color: '#2C2C2A', margin: '0 0 8px 0' },
  infoList: { margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#555550', lineHeight: '1.6' },

  error: { fontSize: '13px', color: '#D63D3D', background: '#FCEBEB', padding: '10px 12px', borderRadius: '8px', textAlign: 'center', margin: 0 },

  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1000 },
  modal: { background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '340px' },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#2C2C2A', margin: 0, marginBottom: '12px' },
  modalText: { fontSize: '14px', color: '#555550', margin: 0, marginBottom: '16px', lineHeight: '1.5' },
  modalList: { margin: '0 0 16px 0', paddingLeft: '20px', fontSize: '13px', color: '#555550', lineHeight: '1.8' },
  modalSmallText: { fontSize: '12px', color: '#7A7A72', textAlign: 'center', margin: '16px 0', fontStyle: 'italic' },
  modalError: { fontSize: '13px', color: '#D63D3D', background: '#FCEBEB', padding: '8px 10px', borderRadius: '6px', margin: '12px 0' },
  modalButtons: { display: 'flex', gap: '12px' },
  modalCancel: { flex: 1, padding: '12px', background: 'white', color: '#555550', fontSize: '15px', fontWeight: '600', borderRadius: '10px', border: '1px solid #E0DDD5', cursor: 'pointer' },
  modalConfirm: { flex: 1, padding: '12px', background: '#1D9E75', color: 'white', fontSize: '15px', fontWeight: '600', borderRadius: '10px', border: 'none', cursor: 'pointer' },
}