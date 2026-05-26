import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore'
import { db } from '../firebase'

export default function Discover({ onGameClick }) {
  const [filter, setFilter] = useState('Any Time')
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Only listen to active games, ordered newest first
    const q = query(
      collection(db, 'games'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    )
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const gamesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setGames(gamesData)
        setLoading(false)
        setError('')
      },
      (err) => {
        console.error('Firestore error:', err)
        setError('Failed to load games. Check your connection and try again.')
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const filteredGames = games.filter((game) => {
    if (filter === 'Tonight') return game.date === today || game.date === 'Tonight'
    if (filter === 'This Week') {
      return (
        game.date === today ||
        game.date === tomorrow ||
        game.date === 'Tonight' ||
        game.date === 'Tomorrow'
      )
    }
    return true
  })

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <span style={styles.wordmark}>stado</span>
      </header>

      <div style={styles.content}>
        <div style={styles.heading}>
          <h1 style={styles.title}>Find a game</h1>
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
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : error ? (
            <div style={styles.empty}>
              <p style={styles.emptyTitle}>Something went wrong</p>
              <p style={styles.emptySubtitle}>{error}</p>
            </div>
          ) : filteredGames.length === 0 ? (
            <div style={styles.empty}>
              <p style={styles.emptyTitle}>No games found</p>
              <p style={styles.emptySubtitle}>
                {filter === 'Tonight'
                  ? 'No games tonight. Post one!'
                  : filter === 'This Week'
                  ? 'Nothing this week yet. Be the first to post.'
                  : 'No games available yet. Post the first one.'}
              </p>
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
  const spots = game.spotsRemaining ?? 0
  let spotsStyle = styles.spotsGreen
  if (spots >= 2 && spots <= 4) spotsStyle = styles.spotsAmber
  if (spots === 1) spotsStyle = styles.spotsRed
  const isFull = spots === 0

  return (
    <article style={styles.card} onClick={onClick}>
      <div style={styles.cardHeader}>
        <div>
          <h3 style={styles.cardName}>{game.name}</h3>
          <span style={styles.format}>{game.format}</span>
        </div>
        <span style={{ ...styles.spotsBadge, ...(isFull ? styles.spotsFull : spotsStyle) }}>
          {isFull ? 'Full' : spots === 1 ? '1 spot left' : `${spots} spots left`}
        </span>
      </div>

      <div style={styles.meta}>
        <div style={styles.metaRow}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#7A7A72" strokeWidth="1.25">
            <path d="M6.5 1a3.75 3.75 0 0 1 3.75 3.75c0 2.625-3.75 7.25-3.75 7.25S2.75 7.375 2.75 4.75A3.75 3.75 0 0 1 6.5 1Z" />
            <circle cx="6.5" cy="4.75" r="1.25" fill="#7A7A72" />
          </svg>
          <span style={styles.metaText}>{game.location}</span>
          {game.distance ? <span style={styles.distance}>{game.distance}</span> : null}
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
        <div style={styles.metaRow}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#7A7A72" strokeWidth="1.25">
            <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" transform="scale(0.54) translate(1,1)" />
          </svg>
          <span style={styles.metaText}>{game.skill}</span>
        </div>
      </div>

      <button
        style={{
          ...styles.joinBtn,
          background: isFull ? '#C9C6BC' : '#1D9E75',
          cursor: isFull ? 'default' : 'pointer',
        }}
        onClick={(e) => { e.stopPropagation(); onClick() }}
      >
        {isFull ? 'View game' : 'Join game'}
      </button>
    </article>
  )
}

function SkeletonCard() {
  return (
    <div style={styles.skeleton}>
      <div style={{ ...styles.skeletonLine, width: '60%', height: '18px' }} />
      <div style={{ ...styles.skeletonLine, width: '30%', height: '14px', marginTop: '8px' }} />
      <div style={{ ...styles.skeletonLine, width: '80%', height: '12px', marginTop: '16px' }} />
      <div style={{ ...styles.skeletonLine, width: '50%', height: '12px', marginTop: '8px' }} />
      <div style={{ ...styles.skeletonLine, width: '100%', height: '40px', marginTop: '16px', borderRadius: '10px' }} />
    </div>
  )
}

const styles = {
  screen: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px 12px', flexShrink: 0,
  },
  wordmark: { fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px', color: '#085041' },
  content: { flex: 1, overflowY: 'auto', paddingBottom: '12px' },
  heading: { padding: '8px 20px 4px' },
  title: { fontSize: '28px', fontWeight: '700', letterSpacing: '-0.8px', color: '#2C2C2A' },
  filters: { display: 'flex', gap: '8px', padding: '12px 20px 16px', flexShrink: 0 },
  chip: {
    padding: '8px 16px', borderRadius: '100px', fontSize: '14px',
    fontWeight: '500', border: '1.5px solid', cursor: 'pointer',
  },
  list: { display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 16px 16px' },
  card: {
    background: 'white', borderRadius: '16px', padding: '16px',
    border: '1px solid #E0DDD5', cursor: 'pointer',
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '12px',
  },
  cardName: { fontSize: '16px', fontWeight: '600', letterSpacing: '-0.2px', marginBottom: '4px' },
  format: {
    fontSize: '12px', fontWeight: '500', color: '#7A7A72',
    background: '#F1EFE8', padding: '3px 8px', borderRadius: '6px',
  },
  spotsBadge: { fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '100px' },
  spotsGreen: { background: '#E1F5EE', color: '#0A6B4E' },
  spotsAmber: { background: '#FAEEDA', color: '#9B5E00' },
  spotsRed: { background: '#FCEBEB', color: '#A02020' },
  spotsFull: { background: '#E0DDD5', color: '#7A7A72' },
  meta: { display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '12px' },
  metaRow: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', color: '#555550' },
  metaText: { flex: 1 },
  distance: {
    fontSize: '12px', color: '#7A7A72', background: '#F1EFE8',
    padding: '2px 7px', borderRadius: '5px',
  },
  joinBtn: {
    width: '100%', padding: '11px 0', color: 'white',
    fontSize: '14px', fontWeight: '600', borderRadius: '10px', border: 'none',
  },
  empty: { textAlign: 'center', padding: '48px 20px' },
  emptyTitle: { fontSize: '17px', fontWeight: '600', color: '#2C2C2A', marginBottom: '8px' },
  emptySubtitle: { fontSize: '14px', color: '#7A7A72' },
  skeleton: {
    background: 'white', borderRadius: '16px', padding: '16px', border: '1px solid #E0DDD5',
  },
  skeletonLine: {
    background: '#E0DDD5', borderRadius: '6px',
    animation: 'pulse 1.4s ease-in-out infinite',
  },
}