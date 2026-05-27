import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import SignIn from './screens/SignIn'
import Onboarding from './screens/Onboarding'
import FirstTimeOnboarding from './screens/FirstTimeOnboarding'
import Discover from './screens/Discover'
import GameDetail from './screens/GameDetail'
import PostGame from './screens/PostGame'
import Profile from './screens/Profile'
import PublicProfile from './screens/PublicProfile'
import Membership from './screens/Membership'

export default function App() {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState('discover')
  const [selectedGame, setSelectedGame] = useState(null)
  const [viewingProfileUid, setViewingProfileUid] = useState(null)
  const [discoverKey, setDiscoverKey] = useState(0)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [paymentBanner, setPaymentBanner] = useState(null)

  const isGuest = user && user.isAnonymous

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const paymentStatus = urlParams.get('payment')
    if (!paymentStatus) return

    window.history.replaceState({}, document.title, '/')

    if (paymentStatus === 'success') {
      setPaymentBanner('success')
      const timer = setTimeout(async () => {
        if (user) {
          try {
            const userSnap = await getDoc(doc(db, 'users', user.uid))
            if (userSnap.exists()) setUserData(userSnap.data())
          } catch (err) {
            console.error('Post-payment re-fetch failed:', err)
          }
        }
        setTimeout(() => setPaymentBanner(null), 5000)
      }, 3000)
      return () => clearTimeout(timer)
    }

    if (paymentStatus === 'cancelled') {
      setPaymentBanner('cancelled')
      setTimeout(() => setPaymentBanner(null), 5000)
    }
  }, [user])

  useEffect(() => {
    const onboardingSeen = localStorage.getItem('stado_onboarding_seen')
    setHasSeenOnboarding(!!onboardingSeen)
    setCheckingOnboarding(false)
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 6000)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeout)
      if (firebaseUser) {
        setUser(firebaseUser)
        try {
          const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userSnap.exists()) {
            setUserData(userSnap.data())
          } else if (firebaseUser.isAnonymous) {
            setUserData({ name: 'Guest', isGuest: true })
          } else {
            setUserData(null)
          }
        } catch (err) {
          console.error('Error fetching user doc:', err)
          setUserData(null)
        }
      } else {
        setUser(null)
        setUserData(null)
      }
      setLoading(false)
    })
    return () => { clearTimeout(timeout); unsubscribe() }
  }, [])

  const goToGame = (game) => { setSelectedGame(game); setScreen('detail') }
  const goBack = () => { setSelectedGame(null); setScreen('discover') }
  const goHome = () => {
    if (screen === 'discover') setDiscoverKey((prev) => prev + 1)
    setScreen('discover')
  }

  const handleViewProfile = (uid) => {
    if (uid === user?.uid) {
      setScreen('profile')
    } else {
      setViewingProfileUid(uid)
      setScreen('publicProfile')
    }
  }

  const handleSignInSuccess = () => setShowAuthPrompt(false)

  const handleOnboardingComplete = async () => {
    if (user) {
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid))
        if (userSnap.exists()) setUserData(userSnap.data())
      } catch (err) { console.error('Error after onboarding:', err) }
    }
  }

  const handleUpdateUserData = (newData) => setUserData(newData)

  const handleGamePosted = async () => {
    if (user) {
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid))
        if (userSnap.exists()) setUserData(userSnap.data())
      } catch (err) { console.error(err) }
    }
    setScreen('discover')
  }

  const handleGameJoined = async () => {
    if (user) {
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid))
        if (userSnap.exists()) setUserData(userSnap.data())
      } catch (err) { console.error(err) }
    }
  }

  const handlePostClick = () => {
    if (isGuest) { setPendingAction('post'); setShowAuthPrompt(true) }
    else setScreen('post')
  }

  const handleJoinClick = () => {
    if (isGuest) { setPendingAction('join'); setShowAuthPrompt(true); return false }
    return true
  }

  const handleAuthPromptClose = async () => {
    setShowAuthPrompt(false)
    setPendingAction(null)
    await signOut(auth)
  }

  const handleFirstTimeOnboardingComplete = () => {
    localStorage.setItem('stado_onboarding_seen', 'true')
    setHasSeenOnboarding(true)
  }

  const handleShowMembership = () => {
    setScreen('membership')
  }

  const handleMembershipBack = async () => {
    if (user) {
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid))
        if (userSnap.exists()) setUserData(userSnap.data())
      } catch (err) { console.error(err) }
    }
    setScreen('profile')
  }

  const showNav = screen !== 'detail' && screen !== 'publicProfile' && screen !== 'membership'
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 769

  if (checkingOnboarding || loading) {
    return (
      <div style={styles.loading}>
        <span style={styles.wordmark}>stado</span>
        <div style={styles.loadingDots}>
          <span style={{...styles.dot, animationDelay: '0s'}} />
          <span style={{...styles.dot, animationDelay: '0.2s'}} />
          <span style={{...styles.dot, animationDelay: '0.4s'}} />
        </div>
        <style>{`@keyframes pulse { 0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }`}</style>
      </div>
    )
  }

  if (!hasSeenOnboarding) return <FirstTimeOnboarding onComplete={handleFirstTimeOnboardingComplete} />
  if (!user) return <SignIn onSuccess={handleSignInSuccess} />
  if (user && !user.isAnonymous && !userData) return <Onboarding onComplete={handleOnboardingComplete} user={user} />

  return (
    <div style={{...styles.container, ...(showNav ? styles.containerWithPadding : {})}}>
      {screen === 'discover' && (
        <Discover key={discoverKey} onGameClick={goToGame} onHomeClick={goHome}
          userData={userData} onJoinWithCode={(game) => { setSelectedGame(game); setScreen('detail') }}
          onProfileClick={() => setScreen('profile')} />
      )}
      {screen === 'detail' && (
        <GameDetail game={selectedGame} onBack={goBack} currentUser={user}
          userData={userData} onJoined={handleGameJoined} onRequireAuth={handleJoinClick}
          onViewProfile={handleViewProfile} />
      )}
      {screen === 'post' && (
        <PostGame onBack={handleGamePosted} currentUser={user} userData={userData} onShowMembership={handleShowMembership} />
      )}
      {screen === 'profile' && (
        <Profile onBack={() => setScreen('discover')} userData={userData}
          onUpdateUser={handleUpdateUserData} currentUser={user}
          onViewProfile={handleViewProfile} onShowMembership={handleShowMembership} />
      )}
      {screen === 'publicProfile' && (
        <PublicProfile uid={viewingProfileUid} currentUser={user}
          onBack={() => setScreen(selectedGame ? 'detail' : 'discover')} />
      )}
      {screen === 'membership' && (
        <Membership onBack={handleMembershipBack} userData={userData}
          currentUser={user} onUpdateUser={handleUpdateUserData} />
      )}

      {showNav && (
        <nav style={{...styles.bottomNav, ...(isDesktop ? styles.bottomNavDesktop : {})}}>
          <NavItem label="Discover" active={screen === 'discover'} onClick={() => setScreen('discover')} />
          <NavPostButton active={screen === 'post'} onClick={handlePostClick} />
          <NavItem label="Profile" active={screen === 'profile'} onClick={() => setScreen('profile')} />
        </nav>
      )}

      {showAuthPrompt && (
        <div style={styles.authPromptOverlay}>
          <div style={styles.authPromptModal}>
            <h3 style={styles.authPromptTitle}>Sign in required</h3>
            <p style={styles.authPromptMessage}>
              {pendingAction === 'post' ? 'You need an account to post games.' : 'You need an account to join games.'}
            </p>
            <div style={styles.authPromptButtons}>
              <button style={styles.authPromptCancel} onClick={() => { setShowAuthPrompt(false); setPendingAction(null) }}>Cancel</button>
              <button style={styles.authPromptSignIn} onClick={handleAuthPromptClose}>Sign in</button>
            </div>
          </div>
        </div>
      )}

      {paymentBanner && (
        <div style={{
          ...styles.banner,
          background: paymentBanner === 'success' ? '#085041' : '#555550',
        }}>
          {paymentBanner === 'success'
            ? 'Welcome to Stado Premium!'
            : 'Payment cancelled. You can upgrade anytime.'}
        </div>
      )}
    </div>
  )
}

function NavItem({ label, active, onClick }) {
  return (
    <button style={{ ...styles.navItem, color: active ? '#1D9E75' : '#7A7A72' }} onClick={onClick}>
      {label === 'Discover' ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="8" r="4" /><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        </svg>
      )}
      <span style={styles.navLabel}>{label}</span>
    </button>
  )
}

function NavPostButton({ onClick, active }) {
  return (
    <button style={{ ...styles.postButton, color: active ? '#1D9E75' : '#7A7A72' }} onClick={onClick}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="5" fill={active ? '#1D9E75' : '#7A7A72'} />
        <path d="M12 8v8M8 12h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span style={styles.postLabel}>Post</span>
    </button>
  )
}

const styles = {
  loading: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F1EFE8', gap: '24px' },
  wordmark: { fontSize: '32px', fontWeight: '700', letterSpacing: '-0.5px', color: '#085041' },
  loadingDots: { display: 'flex', gap: '8px' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: '#1D9E75', animation: 'pulse 1.2s ease-in-out infinite' },
  container: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: '100vh' },
  containerWithPadding: { paddingBottom: '100px' },
  bottomNav: { position: 'fixed', left: '16px', right: '16px', bottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', background: 'white', borderRadius: '40px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px', zIndex: 50 },
  bottomNavDesktop: { left: '50%', right: 'auto', transform: 'translateX(-50%)', bottom: '16px', width: '390px' },
  navItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1, background: 'none', border: 'none', cursor: 'pointer' },
  navLabel: { fontSize: '11px', fontWeight: '500' },
  postButton: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1, background: 'none', border: 'none', cursor: 'pointer' },
  postLabel: { fontSize: '11px', fontWeight: '600' },
  authPromptOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1000 },
  authPromptModal: { background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '320px' },
  authPromptTitle: { fontSize: '18px', fontWeight: '600', color: '#2C2C2A', marginBottom: '12px', textAlign: 'center' },
  authPromptMessage: { fontSize: '14px', color: '#7A7A72', textAlign: 'center', marginBottom: '20px', lineHeight: '1.4' },
  authPromptButtons: { display: 'flex', gap: '12px' },
  authPromptCancel: { flex: 1, padding: '12px', background: 'white', color: '#555550', fontSize: '15px', fontWeight: '600', borderRadius: '10px', border: '1px solid #E0DDD5', cursor: 'pointer' },
  authPromptSignIn: { flex: 1, padding: '12px', background: '#1D9E75', color: 'white', fontSize: '15px', fontWeight: '600', borderRadius: '10px', border: 'none', cursor: 'pointer' },
  banner: { position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 2000, color: 'white', borderRadius: '12px', padding: '12px 20px', fontSize: '14px', fontWeight: '600', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', whiteSpace: 'nowrap', maxWidth: 'calc(100% - 48px)', textAlign: 'center' },
}