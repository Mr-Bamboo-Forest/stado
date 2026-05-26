import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import SignIn from './screens/SignIn'
import Onboarding from './screens/Onboarding'
import Discover from './screens/Discover'
import GameDetail from './screens/GameDetail'
import PostGame from './screens/PostGame'
import Profile from './screens/Profile'

export default function App() {
  const [user, setUser] = useState(null)
  const [hasProfile, setHasProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState('discover')
  const [selectedGame, setSelectedGame] = useState(null)

  // Handle deep-link share URLs: /?game=GAME_ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sharedGameId = params.get('game')
    if (sharedGameId) {
      // Store it and navigate after auth resolves
      sessionStorage.setItem('pendingGameId', sharedGameId)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        const profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid))
        setHasProfile(profileSnap.exists())

        // Handle pending share link navigation
        const pendingGameId = sessionStorage.getItem('pendingGameId')
        if (pendingGameId) {
          sessionStorage.removeItem('pendingGameId')
          try {
            const gameSnap = await getDoc(doc(db, 'games', pendingGameId))
            if (gameSnap.exists()) {
              setSelectedGame({ id: gameSnap.id, ...gameSnap.data() })
              setScreen('detail')
            }
          } catch (e) {
            console.error('Failed to load shared game:', e)
          }
        }
      } else {
        setUser(null)
        setHasProfile(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const goToGame = (game) => {
    setSelectedGame(game)
    setScreen('detail')
  }

  const goBack = () => {
    setSelectedGame(null)
    setScreen('discover')
  }

  // Called by Profile when user signs out
  const handleSignOut = () => {
    setUser(null)
    setHasProfile(null)
    setScreen('discover')
    setSelectedGame(null)
  }

  const handleOnboardingComplete = () => {
    setHasProfile(true)
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <span style={styles.wordmark}>stado</span>
      </div>
    )
  }

  if (!user) {
    return <SignIn onSuccess={() => {}} />
  }

  if (!hasProfile) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  return (
    <div style={styles.container}>
      {screen === 'discover' && <Discover onGameClick={goToGame} />}
      {screen === 'detail' && (
        <GameDetail game={selectedGame} onBack={goBack} currentUser={user} />
      )}
      {screen === 'post' && <PostGame onBack={() => setScreen('discover')} />}
      {screen === 'profile' && (
        <Profile onSignOut={handleSignOut} />
      )}

      {screen !== 'detail' && (
        <nav style={styles.bottomNav}>
          <NavItem
            label="Discover"
            active={screen === 'discover'}
            onClick={() => setScreen('discover')}
          />
          <NavPostButton onClick={() => setScreen('post')} />
          <NavItem
            label="Profile"
            active={screen === 'profile'}
            onClick={() => setScreen('profile')}
          />
        </nav>
      )}
    </div>
  )
}

function NavItem({ label, active, onClick }) {
  return (
    <button
      style={{ ...styles.navItem, color: active ? '#1D9E75' : '#7A7A72' }}
      onClick={onClick}
    >
      {label === 'Discover' ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        </svg>
      )}
      <span style={styles.navLabel}>{label}</span>
    </button>
  )
}

function NavPostButton({ onClick }) {
  return (
    <button style={styles.postButton} onClick={onClick}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="5" fill="#1D9E75" />
        <path d="M12 8v8M8 12h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span style={styles.postLabel}>Post</span>
    </button>
  )
}

const styles = {
  loading: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F1EFE8',
  },
  wordmark: {
    fontSize: '32px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    color: '#085041',
  },
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  bottomNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    background: 'white',
    borderTop: '1px solid #E0DDD5',
    padding: '12px 8px 24px',
    flexShrink: 0,
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  navLabel: {
    fontSize: '11px',
    fontWeight: '500',
  },
  postButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  postLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#1D9E75',
  },
}