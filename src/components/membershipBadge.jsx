/**
 * MembershipBadge
 *
 * Displays a small inline badge for a user's membership tier.
 * Renders nothing for free-tier users.
 *
 * Props:
 *   userData  - Firestore user document (or null)
 *   size      - 'sm' | 'md' (default 'sm')
 */

import { getUserTier, isMembershipActive } from '../membershipUtils'

const TIER_CONFIG = {
  priority: {
    label: 'Priority',
    bg: '#FFF8E1',
    border: '#F0C040',
    color: '#8A6A00',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="#F0C040" stroke="none">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  regular: {
    label: 'Regular',
    bg: '#E8F5E9',
    border: '#1D9E75',
    color: '#085041',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
      </svg>
    ),
  },
}

export default function MembershipBadge({ userData, size = 'sm' }) {
  const tier = getUserTier(userData)
  const active = isMembershipActive(userData)

  // Nothing to show for free users or expired memberships
  if (tier.id === 'free' || !active) return null

  const config = TIER_CONFIG[tier.id]
  if (!config) return null

  const isMd = size === 'md'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isMd ? '5px' : '4px',
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: '100px',
        padding: isMd ? '4px 10px' : '3px 8px',
        fontSize: isMd ? '12px' : '11px',
        fontWeight: '600',
        color: config.color,
        letterSpacing: '0.1px',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {config.icon}
      {config.label}
    </span>
  )
}