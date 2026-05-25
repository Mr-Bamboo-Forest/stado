export default function Profile() {
  const stats = {
    gamesPlayed: 23,
    gamesHosted: 4,
    spotsFilled: 19,
  }

  const positions = [
    { name: 'Goalkeeper', icon: '🧤' },
    { name: 'Defender', icon: '🛡️' },
    { name: 'Midfielder', icon: '🎯' },
    { name: 'Forward', icon: '⚽' },
  ]

  const menuItems = [
    { label: 'Edit profile', icon: 'edit' },
    { label: 'Notification settings', icon: 'bell' },
    { label: 'Privacy', icon: 'lock' },
    { label: 'Help & support', icon: 'help' },
    { label: 'Sign out', icon: 'signout', danger: true },
  ]

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <span style={styles.wordmark}>stado</span>
      </header>

      <div style={styles.content}>
        <div style={styles.profileCard}>
          <div style={styles.avatar}>
            <span style={styles.avatarText}>JD</span>
          </div>
          <h2 style={styles.name}>James Davidson</h2>
          <p style={styles.email}>james.d@email.com</p>
          <div style={styles.rating}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#1D9E75">
              <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
            </svg>
            <span style={styles.ratingText}>4.9 reliability</span>
          </div>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.stat}>
            <p style={styles.statValue}>{stats.gamesPlayed}</p>
            <p style={styles.statLabel}>Games</p>
          </div>
          <div style={styles.stat}>
            <p style={styles.statValue}>{stats.gamesHosted}</p>
            <p style={styles.statLabel}>Hosted</p>
          </div>
          <div style={styles.stat}>
            <p style={styles.statValue}>{stats.spotsFilled}</p>
            <p style={styles.statLabel}>Spots filled</p>
          </div>
        </div>

        <div style={styles.section}>
          <p style={styles.sectionTitle}>Preferred positions</p>
          <div style={styles.positionGrid}>
            {positions.map((pos) => (
              <div key={pos.name} style={styles.positionChip}>
                <span style={styles.positionIcon}>{pos.icon}</span>
                <span style={styles.positionName}>{pos.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          {menuItems.map((item, i) => (
            <button
              key={i}
              style={{
                ...styles.menuItem,
                color: item.danger ? '#D63D3D' : '#2C2C2A',
              }}
            >
              <span style={styles.menuIcon}>
                {item.icon === 'edit' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                )}
                {item.icon === 'bell' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                )}
                {item.icon === 'lock' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
                {item.icon === 'help' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                )}
                {item.icon === 'signout' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                )}
              </span>
              <span style={styles.menuLabel}>{item.label}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  screen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#F1EFE8',
  },
  header: {
    padding: '16px 20px 12px',
  },
  wordmark: {
    fontSize: '24px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    color: '#085041',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  profileCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px 20px',
    border: '1px solid #E0DDD5',
    textAlign: 'center',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: '#1D9E75',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
  },
  avatarText: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'white',
  },
  name: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#2C2C2A',
    marginBottom: '2px',
  },
  email: {
    fontSize: '14px',
    color: '#7A7A72',
    marginBottom: '8px',
  },
  rating: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },
  ratingText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#085041',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-around',
    background: 'white',
    borderRadius: '16px',
    padding: '20px 0',
    border: '1px solid #E0DDD5',
  },
  stat: {
    textAlign: 'center',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#2C2C2A',
  },
  statLabel: {
    fontSize: '12px',
    color: '#7A7A72',
    fontWeight: '500',
  },
  section: {
    background: 'white',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid #E0DDD5',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#2C2C2A',
    marginBottom: '12px',
  },
  positionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  positionChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    background: '#F1EFE8',
    borderRadius: '10px',
  },
  positionIcon: {
    fontSize: '16px',
  },
  positionName: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#2C2C2A',
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 0',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid #E0DDD5',
    cursor: 'pointer',
  },
  menuIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#7A7A72',
  },
  menuLabel: {
    flex: 1,
    textAlign: 'left',
    fontSize: '15px',
    fontWeight: '500',
  },
}
