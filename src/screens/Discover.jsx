import { useState } from 'react'
import { games } from '../data/games'

export default function Discover({ onGameClick }) {
  const [filter, setFilter] = useState('Any Time')

  const filteredGames = games.filter((game) => {
    if (filter === 'Tonight') return game.date === 'Tonight'
    if (filter === 'This Week') return game.date === 'Tonight' || game.date === 'Tomorrow'
    return true
  })

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <span style={styles.wordmark}>stado</span>
        <button style={styles.profileBtn} aria-label="Profile">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="16" fill="#E0DDD5" />
            <circle cx="16" cy="13" r="5" fill="#7A7A72" />
            <path d="M6 26c0-5.523 4.477-10 10-10s10 4.477 10 10" fill="#7A7A72" />
          </svg>
        </button>
      </header>

      <div style={styles.content}>
        <div style={styles.heading}>
          <h1 style={styles.title}>Find a game</h1>
          <p style={styles.subtitle}>Brisbane & surrounds</p>
        </div>

        <div style={styles.filters}>
          {['Tonight', 'This Week', 'Any Time'].map((f) => (
            <button
              key={f}
              style={{
                ...styles.chip,
                background: filter === f ? '#085041' : 'white',
                color: filter === f ? 'white' : '#555550',
                borderColor: filter === f ? '#085041' : '#E0DDD5',
              }}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <div style={styles.list}>
          {filteredGames.length === 0 ? (
            <div style={styles.empty}>
              <p style={styles.emptyText}>No games found</p>
            </div>
          ) : (
            filteredGames.map((game) => (
              <GameCard key={game.id} game={game} onClick={() => onGameClick(game)} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function GameCard({ game, onClick }) {
  const spots = game.spotsRemaining
  let spotsStyle = styles.spotsGreen
  if (spots >= 2 && spots <= 4) spotsStyle = styles.spotsAmber
  if (spots === 1) spotsStyle = styles.spotsRed

  return (
    <article style={styles.card} onClick={onClick}>
      <div style={styles.cardHeader}>
        <div>
          <h3 style={styles.cardName}>{game.name}</h3>
          <span style={styles.format}>{game.format}</span>
        </div>
        <span style={{ ...styles.spotsBadge, ...spotsStyle }}>
          {spots === 1 ? '1 spot left' : `${spots} spots left`}
        </span>
      </div>

      <div style={styles.meta}>
        <div style={styles.metaRow}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#7A7A72" strokeWidth="1.25">
            <path d="M6.5 1a3.75 3.75 0 0 1 3.75 3.75c0 2.625-3.75 7.25-3.75 7.25S2.75 7.375 2.75 4.75A3.75 3.75 0 0 1 6.5 1Z" />
            <circle cx="6.5" cy="4.75" r="1.25" fill="#7A7A72" />
          </svg>
          <span style={styles.metaText}>{game.location}</span>
          <span style={styles.distance}>{game.distance}</span>
        </div>
        <div style={styles.metaRow}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#7A7A72" strokeWidth="1.25">
            <circle cx="6.5" cy="6.5" r="5" />
            <path d="M6.5 4v2.5l1.5 1.5" strokeLinecap="round" />
          </svg>
          <span style={styles.metaText}>{game.date} {game.time}</span>
        </div>
        <div style={styles.metaRow}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#7A7A72" strokeWidth="1.25">
            <circle cx="6.5" cy="4.5" r="2" />
            <path d="M2 11c0-2.485 2.015-4.5 4.5-4.5S11 8.515 11 11" strokeLinecap="round" />
          </svg>
          <span style={styles.metaText}>Hosted by <strong>{game.host}</strong></span>
        </div>
      </div>

      <button style={styles.joinBtn}>Join game</button>
    </article>
  )
}

const styles = {
  screen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px 12px',
    flexShrink: 0,
  },
  wordmark: {
    fontSize: '24px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    color: '#085041',
  },
  profileBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: '12px',
  },
  heading: {
    padding: '8px 20px 4px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    letterSpacing: '-0.8px',
    color: '#2C2C2A',
  },
  subtitle: {
    fontSize: '14px',
    color: '#7A7A72',
    marginTop: '3px',
  },
  filters: {
    display: 'flex',
    gap: '8px',
    padding: '12px 20px 16px',
    flexShrink: 0,
  },
  chip: {
    padding: '8px 16px',
    borderRadius: '100px',
    fontSize: '14px',
    fontWeight: '500',
    border: '1.5px solid',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '0 16px 16px',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid #E0DDD5',
    cursor: 'pointer',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  cardName: {
    fontSize: '16px',
    fontWeight: '600',
    letterSpacing: '-0.2px',
    marginBottom: '4px',
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
  meta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
    marginBottom: '12px',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13.5px',
    color: '#555550',
  },
  metaText: {
    flex: 1,
  },
  distance: {
    fontSize: '12px',
    color: '#7A7A72',
    background: '#F1EFE8',
    padding: '2px 7px',
    borderRadius: '5px',
  },
  joinBtn: {
    width: '100%',
    padding: '11px 0',
    background: '#1D9E75',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    padding: '48px 20px',
  },
  emptyText: {
    fontSize: '17px',
    fontWeight: '600',
    color: '#2C2C2A',
  },
}
