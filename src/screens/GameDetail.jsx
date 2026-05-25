import { useState } from 'react'

export default function GameDetail({ game, onBack }) {
  const [joined, setJoined] = useState(false)

  const spots = game.spotsRemaining
  let spotsStyle = styles.spotsGreen
  if (spots >= 2 && spots <= 4) spotsStyle = styles.spotsAmber
  if (spots === 1) spotsStyle = styles.spotsRed

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onBack} aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2C2C2A" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span style={styles.headerTitle}>Game Details</span>
        <div style={styles.headerSpacer} />
      </header>

      <div style={styles.content}>
        <div style={styles.hero}>
          <div style={styles.heroTop}>
            <h1 style={styles.gameName}>{game.name}</h1>
            <span style={styles.format}>{game.format}</span>
          </div>
          <span style={{ ...styles.spotsBadge, ...spotsStyle }}>
            {spots === 1 ? '1 spot left' : `${spots} spots left`}
          </span>
        </div>

        <div style={styles.section}>
          <div style={styles.infoRow}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div>
              <p style={styles.infoLabel}>Location</p>
              <p style={styles.infoValue}>{game.location}</p>
              {joined && <p style={styles.address}>{game.address}</p>}
            </div>
          </div>
          <div style={styles.infoRow}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <div>
              <p style={styles.infoLabel}>Time</p>
              <p style={styles.infoValue}>{game.date} {game.time}</p>
            </div>
          </div>
          <div style={styles.infoRow}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <div>
              <p style={styles.infoLabel}>Host</p>
              <p style={styles.infoValue}>{game.host}</p>
            </div>
          </div>
          <div style={styles.infoRow}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="2">
              <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
            </svg>
            <div>
              <p style={styles.infoLabel}>Level</p>
              <p style={styles.infoValue}>{game.skill}</p>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <p style={styles.sectionTitle}>About</p>
          <p style={styles.note}>{game.note}</p>
        </div>

        <div style={styles.section}>
          <p style={styles.sectionTitle}>Players ({game.players.length}/{game.spotsTotal})</p>
          <div style={styles.playerList}>
            {game.players.map((player, i) => (
              <div key={i} style={styles.playerChip}>
                <div style={styles.playerAvatar}>
                  {player[0]}
                </div>
                <span style={styles.playerName}>{player}</span>
                {player === game.host && (
                  <span style={styles.hostBadge}>Host</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {!joined ? (
          <button style={styles.joinBtn} onClick={() => setJoined(true)}>
            Join game to see address
          </button>
        ) : (
          <div style={styles.joinedState}>
            <p style={styles.joinedText}>You&apos;re in! See you there.</p>
            <button style={styles.addressBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Open in Maps
            </button>
          </div>
        )}
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'white',
    borderBottom: '1px solid #E0DDD5',
    flexShrink: 0,
  },
  backBtn: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2C2C2A',
  },
  headerSpacer: {
    width: '40px',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  hero: {
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #E0DDD5',
  },
  heroTop: {
    marginBottom: '12px',
  },
  gameName: {
    fontSize: '22px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    marginBottom: '8px',
  },
  format: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#7A7A72',
    background: '#F1EFE8',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  spotsBadge: {
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '100px',
  },
  spotsGreen: {
    background: '#E1F5EE',
    color: '#0A6B4E',
  },
  spotsAmber: {
    background: '#FAEEDA',
    color: '#9B5E00',
  },
  spotsRed: {
    background: '#FCEBEB',
    color: '#A02020',
  },
  section: {
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #E0DDD5',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  infoRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#7A7A72',
    marginBottom: '2px',
  },
  infoValue: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#2C2C2A',
  },
  address: {
    fontSize: '13px',
    color: '#555550',
    marginTop: '4px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2C2C2A',
    marginTop: '-4px',
  },
  note: {
    fontSize: '14px',
    color: '#555550',
    lineHeight: '1.5',
  },
  playerList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  playerChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#F1EFE8',
    padding: '6px 10px 6px 6px',
    borderRadius: '100px',
  },
  playerAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#1D9E75',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
  },
  playerName: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#2C2C2A',
  },
  hostBadge: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#085041',
    background: '#E1F5EE',
    padding: '2px 6px',
    borderRadius: '4px',
    marginLeft: '-2px',
  },
  joinBtn: {
    width: '100%',
    padding: '14px 0',
    background: '#1D9E75',
    color: 'white',
    fontSize: '15px',
    fontWeight: '600',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    marginTop: 'auto',
  },
  joinedState: {
    background: '#E1F5EE',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center',
    marginTop: 'auto',
  },
  joinedText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#085041',
    marginBottom: '12px',
  },
  addressBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    background: '#085041',
    color: 'white',
    fontSize: '13px',
    fontWeight: '600',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
  },
}
