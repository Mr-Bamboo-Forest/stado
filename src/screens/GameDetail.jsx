import { useState, useEffect } from 'react'
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase'

export default function GameDetail({ game: initialGame, onBack, currentUser }) {
  const [game, setGame] = useState(initialGame)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shareToast, setShareToast] = useState(false)
  const [noShowToast, setNoShowToast] = useState(false)

  const userId = currentUser?.uid
  const userName = currentUser?.displayName || 'Player'

  // Live updates from Firestore so spots stay accurate
  useEffect(() => {
    if (!game?.id) return
    const unsub = onSnapshot(doc(db, 'games', game.id), (snap) => {
      if (snap.exists()) {
        setGame({ id: snap.id, ...snap.data() })
      }
    })
    return () => unsub()
  }, [game?.id])

  const isHost = game?.hostId === userId
  const hasJoined = game?.playerIds?.includes(userId)
  const isFull = game?.spotsRemaining <= 0 && !hasJoined

  const spots = game?.spotsRemaining ?? 0
  let spotsStyle = styles.spotsGreen
  if (spots >= 2 && spots <= 4) spotsStyle = styles.spotsAmber
  if (spots === 1) spotsStyle = styles.spotsRed

  const handleJoin = async () => {
    if (!userId || loading) return
    setLoading(true)
    setError('')
    try {
      const ref = doc(db, 'games', game.id)
      // Re-read to prevent race condition on spotsRemaining
      const snap = await getDoc(ref)
      if (!snap.exists()) { setError('This game no longer exists.'); return }
      const data = snap.data()
      if (data.playerIds?.includes(userId)) { setError('You have already joined.'); return }
      if (data.spotsRemaining <= 0) { setError('Sorry, this game is now full.'); return }

      await updateDoc(ref, {
        playerIds: arrayUnion(userId),
        players: arrayUnion(userName),
        spotsRemaining: increment(-1),
      })
    } catch (e) {
      console.error(e)
      setError('Failed to join. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLeave = async () => {
    if (!userId || loading) return
    setLoading(true)
    setError('')
    try {
      await updateDoc(doc(db, 'games', game.id), {
        playerIds: arrayRemove(userId),
        players: arrayRemove(userName),
        spotsRemaining: increment(1),
      })
    } catch (e) {
      console.error(e)
      setError('Failed to leave. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!isHost || loading) return
    if (!window.confirm('Cancel this game? All players will lose their spot.')) return
    setLoading(true)
    try {
      await updateDoc(doc(db, 'games', game.id), { status: 'cancelled' })
      onBack()
    } catch (e) {
      console.error(e)
      setError('Failed to cancel. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkNoShow = async (playerName, playerId) => {
    if (!isHost || !playerId) return
    try {
      await updateDoc(doc(db, 'users', playerId), {
        noShowCount: increment(1),
        noShowGames: arrayUnion(game.id),
      })
      setNoShowToast(true)
      setTimeout(() => setNoShowToast(false), 2500)
    } catch (e) {
      console.error(e)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/?game=${game.id}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: game.name,
          text: `Join my football game: ${game.name} on ${game.date} at ${game.time}`,
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        setShareToast(true)
        setTimeout(() => setShareToast(false), 2500)
      }
    } catch (e) {
      // User cancelled share or clipboard failed
      try {
        await navigator.clipboard.writeText(url)
        setShareToast(true)
        setTimeout(() => setShareToast(false), 2500)
      } catch {}
    }
  }

  const handleMapsLink = () => {
    const encoded = encodeURIComponent(game.address || game.location)
    window.open(`https://maps.google.com/?q=${encoded}`, '_blank')
  }

  if (game?.status === 'cancelled') {
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
        <div style={styles.cancelledState}>
          <p style={styles.cancelledText}>This game has been cancelled.</p>
          <button style={styles.backLink} onClick={onBack}>Back to Discover</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.screen}>
      {/* Toast notifications */}
      {shareToast && (
        <div style={styles.toast}>Link copied to clipboard</div>
      )}
      {noShowToast && (
        <div style={styles.toast}>No-show recorded</div>
      )}

      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onBack} aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2C2C2A" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span style={styles.headerTitle}>Game Details</span>
        <button style={styles.shareBtn} onClick={handleShare} aria-label="Share">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#085041" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      </header>

      <div style={styles.content}>
        {/* Hero */}
        <div style={styles.hero}>
          <div style={styles.heroTop}>
            <h1 style={styles.gameName}>{game?.name}</h1>
            <span style={styles.format}>{game?.format}</span>
          </div>
          <span style={{ ...styles.spotsBadge, ...spotsStyle }}>
            {spots === 1 ? '1 spot left' : `${spots} spots left`}
          </span>
        </div>

        {/* Info */}
        <div style={styles.section}>
          <div style={styles.infoRow}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div>
              <p style={styles.infoLabel}>Location</p>
              <p style={styles.infoValue}>{game?.location}</p>
              {hasJoined && game?.address && (
                <p style={styles.address}>{game.address}</p>
              )}
              {!hasJoined && (
                <p style={styles.addressHint}>Join to see full address</p>
              )}
            </div>
          </div>
          <div style={styles.infoRow}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <div>
              <p style={styles.infoLabel}>Time</p>
              <p style={styles.infoValue}>{game?.date} {game?.time}</p>
            </div>
          </div>
          <div style={styles.infoRow}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <div>
              <p style={styles.infoLabel}>Host</p>
              <p style={styles.infoValue}>{game?.host}</p>
            </div>
          </div>
          <div style={styles.infoRow}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="2">
              <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
            </svg>
            <div>
              <p style={styles.infoLabel}>Level</p>
              <p style={styles.infoValue}>{game?.skill}</p>
            </div>
          </div>
        </div>

        {/* About */}
        {game?.note ? (
          <div style={styles.section}>
            <p style={styles.sectionTitle}>About</p>
            <p style={styles.note}>{game.note}</p>
          </div>
        ) : null}

        {/* Players */}
        <div style={styles.section}>
          <p style={styles.sectionTitle}>
            Players ({(game?.players?.length ?? 0)}/{game?.spotsTotal ?? 0})
          </p>
          <div style={styles.playerList}>
            {(game?.players ?? []).map((player, i) => {
              const pid = game?.playerIds?.[i]
              const isThisHost = player === game?.host
              return (
                <div key={i} style={styles.playerChip}>
                  <div style={styles.playerAvatar}>{player[0]}</div>
                  <span style={styles.playerName}>{player}</span>
                  {isThisHost && <span style={styles.hostBadge}>Host</span>}
                  {/* Host can mark no-shows after the game has passed */}
                  {isHost && !isThisHost && pid && (
                    <button
                      style={styles.noShowBtn}
                      onClick={() => handleMarkNoShow(player, pid)}
                      title="Mark as no-show"
                    >
                      No-show
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Error */}
        {error && <p style={styles.errorText}>{error}</p>}

        {/* Actions */}
        {isHost ? (
          <div style={styles.hostActions}>
            <div style={styles.joinedState}>
              <p style={styles.joinedText}>You are hosting this game.</p>
              {hasJoined && (
                <button style={styles.addressBtn} onClick={handleMapsLink}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Open in Maps
                </button>
              )}
            </div>
            <button
              style={{ ...styles.cancelBtn, opacity: loading ? 0.6 : 1 }}
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel game
            </button>
          </div>
        ) : hasJoined ? (
          <div style={styles.joinedState}>
            <p style={styles.joinedText}>You're in! See you there.</p>
            <div style={styles.joinedBtns}>
              <button style={styles.addressBtn} onClick={handleMapsLink}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Open in Maps
              </button>
              <button
                style={{ ...styles.leaveBtn, opacity: loading ? 0.6 : 1 }}
                onClick={handleLeave}
                disabled={loading}
              >
                {loading ? 'Leaving...' : 'Leave game'}
              </button>
            </div>
          </div>
        ) : (
          <button
            style={{
              ...styles.joinBtn,
              opacity: loading || isFull ? 0.6 : 1,
              background: isFull ? '#C9C6BC' : '#1D9E75',
            }}
            onClick={handleJoin}
            disabled={loading || isFull}
          >
            {loading ? 'Joining...' : isFull ? 'Game is full' : 'Join game to see address'}
          </button>
        )}
      </div>
    </div>
  )
}

const styles = {
  screen: { flex: 1, display: 'flex', flexDirection: 'column', background: '#F1EFE8' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', background: 'white', borderBottom: '1px solid #E0DDD5', flexShrink: 0,
  },
  backBtn: {
    width: '40px', height: '40px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', borderRadius: '12px', background: 'none', border: 'none', cursor: 'pointer',
  },
  shareBtn: {
    width: '40px', height: '40px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', borderRadius: '12px', background: '#E1F5EE', border: 'none', cursor: 'pointer',
  },
  headerTitle: { fontSize: '16px', fontWeight: '600', color: '#2C2C2A' },
  content: {
    flex: 1, overflowY: 'auto', padding: '20px 16px',
    display: 'flex', flexDirection: 'column', gap: '20px',
  },
  hero: {
    background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #E0DDD5',
  },
  heroTop: { marginBottom: '12px' },
  gameName: { fontSize: '22px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '8px' },
  format: {
    fontSize: '12px', fontWeight: '500', color: '#7A7A72',
    background: '#F1EFE8', padding: '3px 8px', borderRadius: '6px',
  },
  spotsBadge: {
    display: 'inline-block', fontSize: '12px', fontWeight: '600',
    padding: '4px 10px', borderRadius: '100px',
  },
  spotsGreen: { background: '#E1F5EE', color: '#0A6B4E' },
  spotsAmber: { background: '#FAEEDA', color: '#9B5E00' },
  spotsRed: { background: '#FCEBEB', color: '#A02020' },
  section: {
    background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #E0DDD5',
    display: 'flex', flexDirection: 'column', gap: '16px',
  },
  infoRow: { display: 'flex', gap: '12px', alignItems: 'flex-start' },
  infoLabel: { fontSize: '12px', fontWeight: '500', color: '#7A7A72', marginBottom: '2px' },
  infoValue: { fontSize: '15px', fontWeight: '500', color: '#2C2C2A' },
  address: { fontSize: '13px', color: '#555550', marginTop: '4px' },
  addressHint: { fontSize: '12px', color: '#7A7A72', marginTop: '4px', fontStyle: 'italic' },
  sectionTitle: { fontSize: '14px', fontWeight: '600', color: '#2C2C2A', marginTop: '-4px' },
  note: { fontSize: '14px', color: '#555550', lineHeight: '1.5' },
  playerList: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  playerChip: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: '#F1EFE8', padding: '6px 10px 6px 6px', borderRadius: '100px',
  },
  playerAvatar: {
    width: '28px', height: '28px', borderRadius: '50%', background: '#1D9E75',
    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: '600',
  },
  playerName: { fontSize: '13px', fontWeight: '500', color: '#2C2C2A' },
  hostBadge: {
    fontSize: '10px', fontWeight: '600', color: '#085041',
    background: '#E1F5EE', padding: '2px 6px', borderRadius: '4px', marginLeft: '-2px',
  },
  noShowBtn: {
    fontSize: '10px', fontWeight: '600', color: '#D63D3D',
    background: '#fde8e8', padding: '2px 6px', borderRadius: '4px',
    border: 'none', cursor: 'pointer', marginLeft: '-2px',
  },
  errorText: {
    fontSize: '13px', color: '#D63D3D', textAlign: 'center',
    background: '#fde8e8', padding: '10px 14px', borderRadius: '10px',
  },
  joinBtn: {
    width: '100%', padding: '14px 0', color: 'white',
    fontSize: '15px', fontWeight: '600', borderRadius: '12px', border: 'none', cursor: 'pointer',
  },
  joinedState: {
    background: '#E1F5EE', borderRadius: '12px', padding: '16px', textAlign: 'center',
  },
  joinedText: { fontSize: '14px', fontWeight: '600', color: '#085041', marginBottom: '12px' },
  joinedBtns: { display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' },
  addressBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '10px 16px', background: '#085041', color: 'white',
    fontSize: '13px', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer',
  },
  leaveBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '10px 16px', background: 'white', color: '#D63D3D',
    fontSize: '13px', fontWeight: '600', borderRadius: '8px',
    border: '1px solid #D63D3D', cursor: 'pointer',
  },
  hostActions: { display: 'flex', flexDirection: 'column', gap: '10px' },
  cancelBtn: {
    width: '100%', padding: '13px 0', background: 'none',
    color: '#D63D3D', fontSize: '14px', fontWeight: '600',
    borderRadius: '12px', border: '1px solid #D63D3D', cursor: 'pointer',
  },
  cancelledState: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '16px', padding: '40px 24px',
  },
  cancelledText: { fontSize: '16px', fontWeight: '600', color: '#2C2C2A' },
  backLink: {
    fontSize: '14px', fontWeight: '600', color: '#085041',
    background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
  },
  toast: {
    position: 'fixed', bottom: '96px', left: '50%', transform: 'translateX(-50%)',
    background: '#2C2C2A', color: 'white', fontSize: '13px', fontWeight: '500',
    padding: '10px 18px', borderRadius: '100px', zIndex: 999, whiteSpace: 'nowrap',
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  },
}