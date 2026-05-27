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

  const isGuest = user && user.isAnonymous

  // Listen for Stripe Redirect Url parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');

    if (paymentStatus === 'success') {
      alert('Welcome to Stado Premium! Your membership is active.');
      // Clean up parameters from url address bar
      window.history.replaceState({}, document.title, "/");
      
      // Force refresh data from Firestore to reveal premium status
      if (user) {
        getDoc(doc(db, 'users', user.uid)).then((userSnap) => {
          if (userSnap.exists()) setUserData(userSnap.data());
        }).catch(err => console.error(err));
      }
    } else if (paymentStatus === 'cancelled') {
      alert('Payment cancelled. You can try upgrading again whenever you are ready.');
      window.history.replaceState({}, document.title, "/");
    }
  }, [user]);

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
              <button style={styles.authPromptConfirm} onClick={handleAuthPromptClose}>Sign In</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Minimal Navigation UI placeholder links
function NavItem({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '12px',
      color: active ? '#1D9E75' : '#2C2C2A',
      fontWeight: active ? '600' : '400'
    }}>{label}</button>
  )
}

function NavPostButton({ onClick }) {
  return (
    <button onClick={onClick} style={{
      backgroundColor: '#1D9E75',
      color: '#F1EFE8',
      borderRadius: '50%',
      width: '48px',
      height: '48px',
      fontSize: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>+</button>
  )
}

const styles = {
  container: { width: '100%', minHeight: '100dvh', position: 'relative' },
  containerWithPadding: { paddingBottom: '70px' },bottomNav: {position: 'fixed', bottom: 0, left: 0, right: 0, height: '65px',backgroundColor: '#F1EFE8', borderTop: '1px solid #E0DDD5',display: 'flex', alignItems: 'center', justifyContent: 'space-around', zIndex: 1000},bottomNavDesktop: { maxWidth: '390px', left: '50%', transform: 'translateX(-50%)', borderRadius: '0 0 40px 40px' },loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', backgroundColor: '#F1EFE8' },wordmark: { fontSize: '32px', fontWeight: 'bold', color: '#2C2C2A', letterSpacing: '-1px' },loadingDots: { display: 'flex', gap: '6px', marginTop: '12px' },dot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1D9E75', animation: 'pulse 1.4s infinite ease-in-out both' },authPromptOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },authPromptModal: { backgroundColor: '#F1EFE8', padding: '24px', borderRadius: '20px', width: '85%', maxWidth: '320px', textAlign: 'center' },authPromptTitle: { margin: '0 0 8px 0', color: '#2C2C2A' },authPromptMessage: { margin: '0 0 20px 0', color: '#555550', fontSize: '14px' },authPromptButtons: { display: 'flex', gap: '12px', justifyContent: 'center' },authPromptCancel: { padding: '10px 16px', color: '#2C2C2A', fontSize: '14px' },authPromptConfirm: { padding: '10px 16px', backgroundColor: '#1D9E75', color: '#F1EFE8', borderRadius: '8px', fontWeight: '500', fontSize: '14px' }
}