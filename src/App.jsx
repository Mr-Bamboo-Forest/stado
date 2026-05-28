import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
// ✅ ADDED: Your hook import
import { useUserData } from './hooks/useUserData' 
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
  // ✅ ONE LINE: Handles all user data fetching
  const { userData, loading: userDataLoading } = useUserData(user?.uid)
  
  const [authLoading, setAuthLoading] = useState(true)
  const [screen, setScreen] = useState('discover')
  const [selectedGame, setSelectedGame] = useState(null)
  const [viewingProfileUid, setViewingProfileUid] = useState(null)
  const [discoverKey, setDiscoverKey] = useState(0)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [checkoutSessionId, setCheckoutSessionId] = useState(null)
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [paymentBanner, setPaymentBanner] = useState(null)

  const isGuest = user && user.isAnonymous

  // Handle URL Params for Stripe Payments
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const paymentStatus = urlParams.get('payment')
    const sessionId = urlParams.get('session_id')
    if (!paymentStatus) return

    window.history.replaceState({}, document.title, '/')
    setCheckoutSessionId(sessionId)

    if (paymentStatus === 'success') {
      setPaymentBanner('success')
      return
    }

    if (paymentStatus === 'cancelled') {
      setPaymentBanner('cancelled')
      setTimeout(() => setPaymentBanner(null), 5000)
    }
  }, [])

  // 📍 HERE IS WHERE YOUR TOKEN BLOCK WAS PLACED:
  // Payment verification - no manual fetches
  useEffect(() => {
    if (!user || paymentBanner !== 'success') return

    const handlePaymentVerify = async () => {
      try {
        if (checkoutSessionId) {
          // ✅ YOUR TOKEN CODE:
          const token = await user.getIdToken()
          await fetch('/api/verifyCheckoutSession', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` // ✅ SEND TOKEN
            },
            body: JSON.stringify({ sessionId: checkoutSessionId }),
          })
          // ✅ userData auto-updates via hook
        }
      } catch (err) {
        console.error('Post-payment verification failed:', err)
      } finally {
        setScreen('profile')
        setTimeout(() => setPaymentBanner(null), 5000)
      }
    }

    handlePaymentVerify()
  }, [user, paymentBanner, checkoutSessionId])

  // Check Onboarding status on load
  useEffect(() => {
    const onboardingSeen = localStorage.getItem('stado_onboarding_seen')
    setHasSeenOnboarding(!!onboardingSeen)
    setCheckingOnboarding(false)
  }, [])

  // Auth state effect - simple!
  useEffect(() => {
    const timeout = setTimeout(() => setAuthLoading(false), 6000)
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(timeout)
      setUser(firebaseUser)
      setAuthLoading(false)
      // ✅ That's it! useUserData hook handles the rest automatically
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

  // All handlers now just do their thing
  const handleOnboardingComplete = () => {
    // ✅ userData auto-syncs via hook
  }

  const handleGamePosted = () => {
    // ✅ userData auto-syncs via hook
    setScreen('discover')
  }

  const handleGameJoined = () => {
    // ✅ userData auto-syncs via hook
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

  const handleMembershipBack = () => {
    // ✅ userData auto-syncs via hook
    setScreen('profile')
  }

  const showNav = screen !== 'detail' && screen !== 'publicProfile' && screen !== 'membership'
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 769
  const isCombinedLoading = checkingOnboarding || authLoading || (user && userDataLoading)

  if (isCombinedLoading) {
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
      {paymentBanner && (
        <div style={paymentBanner === 'success' ? styles.bannerSuccess : styles.bannerCancel}>
          {paymentBanner === 'success' ? 'Payment Successful! Welcome to membership.' : 'Payment Cancelled.'}
        </div>
      )}

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
          currentUser={user} onViewProfile={handleViewProfile} onShowMembership={handleShowMembership} />
      )}
      {screen === 'publicProfile' && (
        <PublicProfile uid={viewingProfileUid} currentUser={user}
          onBack={() => setScreen(selectedGame ? 'detail' : 'discover')} />
      )}
      {screen === 'membership' && (
        <Membership onBack={handleMembershipBack} userData={userData} currentUser={user} />
      )}

      {showNav && (
        <nav style={{...styles.bottomNav, ...(isDesktop ? styles.bottomNavDesktop : {})}}>
          <NavItem label="Discover" active={screen === 'discover'} onClick={() => setScreen('discover')} />
          <NavPostButton active={screen === 'post'} onClick={handlePostClick} />
          <NavItem label="Profile" active={screen === 'profile'} onClick={() => setScreen('profile')} />
        </nav>
      )}

      {showAuthPrompt && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Account Required</h3>
            <p>You need a full account to complete this action ({pendingAction}).</p>
            <button onClick={handleAuthPromptClose}>Sign In / Register</button>
            <button onClick={() => setShowAuthPrompt(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Dummy structural UI pieces for bottom navigation components referenced in layout
function NavItem({ label, active, onClick }) {
  return <button onClick={onClick} style={{ background: 'none', border: 'none', fontWeight: active ? 'bold' : 'normal' }}>{label}</button>
}
function NavPostButton({ onClick }) {
  return <button onClick={onClick} style={{ borderRadius: '50%', padding: '8px 16px' }}>+</button>
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