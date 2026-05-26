import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import SignIn from './screens/SignIn'
import Onboarding from './screens/Onboarding'
import Discover from './screens/Discover'
import GameDetail from './screens/GameDetail'
import PostGame from './screens/PostGame'
import Profile from './screens/Profile'

export default function App() {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState('discover')
  const [selectedGame, setSelectedGame] = useState(null)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  const isGuest = user && user.isAnonymous

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (userSnap.exists()) {
          setUserData(userSnap.data())
        } else {
          setUserData(null)
        }
      } else {
        setUser(null)
        setUserData(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const goToGame = (game) => {
    setSelectedGame(game)
    setScreen('detail')
  }

  const goToGameDetail = (game) => {
    setSelectedGame(game)
    setScreen('detail')
  }

  const goBack = () => {
    setSelectedGame(null)
    setScreen('discover')
  }

  const handleSignInSuccess = () => {
    setShowAuthPrompt(false)
  }

  const handleOnboardingComplete = async () => {
    if (user) {
      const userSnap = await getDoc(doc(db, 'users', user.uid))
      if (userSnap.exists()) {
        setUserData(userSnap.data())
      }
    }
  }

  const handleUpdateUserData = (newData) => {
    setUserData(newData)
  }

  const handleGamePosted = async () => {
    if (user) {
      const userSnap = await getDoc(doc(db, 'users', user.uid))
      if (userSnap.exists()) {
        setUserData(userSnap.data())
      }
    }
    setScreen('discover')
  }

  const handleGameJoined = async () => {
    if (user) {
      const userSnap = await getDoc(doc(db, 'users', user.uid))
      if (userSnap.exists()) {
        setUserData(userSnap.data())
      }
    }
  }

  const handlePostClick = () => {
    if (isGuest) {
      setPendingAction('post')
      setShowAuthPrompt(true)
    } else {
      setScreen('post')
    }
  }

  const handleJoinClick = () => {
    if (isGuest) {
      setPendingAction('join')
      setShowAuthPrompt(true)
      return false
    }
    return true
  }

  const handleAuthPromptClose = async () => {
    setShowAuthPrompt(false)
    if (pendingAction === 'post') {
      setScreen('post')
    }
    setPendingAction(null)
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <span style={styles.wordmark}>stado</span>
      </div>
    )
  }

  if (!user) {
    return <SignIn onSuccess={handleSignInSuccess} />
  }

  if (!userData) {
    return <Onboarding onComplete={handleOnboardingComplete} user={user} />
  }

  return (
    <div style={styles.container}>
      {screen === 'discover' && (
        <Discover
          onGameClick={goToGame}
          userData={userData}
          onJoinWithCode={goToGameDetail}
          onProfileClick={() => setScreen('profile')}
        />
      )}
      {screen === 'detail' && (
        <GameDetail
          game={selectedGame}
          onBack={goBack}
          currentUser={user}
          userData={userData}
          onJoined={handleGameJoined}
          onRequireAuth={handleJoinClick}
        />
      )}
      {screen === 'post' && (
        <PostGame onBack={handleGamePosted} currentUser={user} userData={userData} />
      )}
      {screen === 'profile' && (
        <Profile
          onBack={() => setScreen('discover')}
          userData={userData}
          onUpdateUser={handleUpdateUserData}
        />
      )}

      {screen !== 'detail' && (
        <nav style={styles.bottomNav}>
          <NavItem
            label="Discover"
            active={screen === 'discover'}
            onClick={() => setScreen('discover')}
          />
          <NavPostButton onClick={handlePostClick} />
          <NavItem
            label="Profile"
            active={screen === 'profile'}
            onClick={() => setScreen('profile')}
          />
        </nav>
      )}

      {showAuthPrompt && (
        <div style={styles.authPromptOverlay}>
          <div style={styles.authPromptModal}>
            <h3 style={styles.authPromptTitle}>Sign in required</h3>
            <p style={styles.authPromptMessage}>
              {pendingAction === 'post'
                ? 'You need to create an account to post games.'
                : 'You need to create an account to join games.'}
            </p>
            <div style={styles.authPromptButtons}>
              <button
                style={styles.authPromptCancel}
                onClick={() => {
                  setShowAuthPrompt(false)
                  setPendingAction(null)
                }}
              >
                Cancel
              </button>
              <button style={styles.authPromptSignIn} onClick={handleAuthPromptClose}>
                Sign in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NavItem({ label, active, onClick }) {
  return (
    <button style={{
      ...styles.navItem,
      color: active ? '#1D9E75' : '#7A7A72',
    }} onClick={onClick}>
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
    padding: '12px 8px calc(24px + env(safe-area-inset-bottom))',
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
  authPromptOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    zIndex: 1000,
  },
  authPromptModal: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '320px',
  },
  authPromptTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2C2C2A',
    marginBottom: '12px',
    textAlign: 'center',
  },
  authPromptMessage: {
    fontSize: '14px',
    color: '#7A7A72',
    textAlign: 'center',
    marginBottom: '20px',
    lineHeight: '1.4',
  },
  authPromptButtons: {
    display: 'flex',
    gap: '12px',
  },
  authPromptCancel: {
    flex: 1,
    padding: '12px',
    background: 'white',
    color: '#555550',
    fontSize: '15px',
    fontWeight: '600',
    borderRadius: '10px',
    border: '1px solid #E0DDD5',
    cursor: 'pointer',
  },
  authPromptSignIn: {
    flex: 1,
    padding: '12px',
    background: '#1D9E75',
    color: 'white',
    fontSize: '15px',
    fontWeight: '600',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
  },
}
