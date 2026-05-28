import { useState, useEffect } from 'react'
import { getAuth, signOut } from 'firebase/auth'
import { doc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore'
import { db } from '../firebase'
import { getUserTier, getEffectiveTier, isMembershipActive, getDaysRemaining } from '../membershipUtils'
import MembershipBadge from '../components/membershipBadge'

export default function Profile({ onBack, userData, onUpdateUser, currentUser, onViewProfile, onShowMembership, onShowPrivacy, onShowTerms }) {
  const auth = getAuth()
  const user = auth.currentUser
  const [friendRequests, setFriendRequests] = useState([])
  const [friends, setFriends] = useState([])
  const [showFindPlayer, setShowFindPlayer] = useState(false)
  const [findCode, setFindCode] = useState('')
  const [findResult, setFindResult] = useState(null)
  const [findError, setFindError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchFriendRequests()
    fetchFriends()
  }, [user])

  const fetchFriendRequests = async () => {
    try {
      const q = query(collection(db, 'friendRequests'),
        where('toUid', '==', user.uid),
        where('status', '==', 'pending')
      )
      const snap = await getDocs(q)
      const requests = []
      for (const d of snap.docs) {
        const reqData = { id: d.id, ...d.data() }
        const fromSnap = await getDoc(doc(db, 'users', reqData.fromUid))
        if (fromSnap.exists()) reqData.fromUser = fromSnap.data()
        requests.push(reqData)
      }
      setFriendRequests(requests)
    } catch (e) { console.error(e) }
  }

  const fetchFriends = async () => {
    if (!userData?.friends?.length) return
    try {
      const friendList = []
      for (const uid of userData.friends) {
        const snap = await getDoc(doc(db, 'users', uid))
        if (snap.exists()) friendList.push({ uid, ...snap.data() })
      }
      setFriends(friendList)
    } catch (e) { console.error(e) }
  }

  const handleAcceptFriend = async (request) => {
    try {
      // Use arrayUnion so we never overwrite either user's existing friends list
      await updateDoc(doc(db, 'users', user.uid), {
        friends: arrayUnion(request.fromUid)
      })
      await updateDoc(doc(db, 'users', request.fromUid), {
        friends: arrayUnion(user.uid)
      })
      await deleteDoc(doc(db, 'friendRequests', request.id))
      fetchFriendRequests()
      fetchFriends()
      onUpdateUser({ ...userData, friends: [...(userData?.friends || []), request.fromUid] })
    } catch (e) { console.error(e) }
  }

  const handleDeclineFriend = async (request) => {
    try {
      await deleteDoc(doc(db, 'friendRequests', request.id))
      fetchFriendRequests()
    } catch (e) { console.error(e) }
  }

  const handleFindPlayer = async () => {
    setFindError('')
    setFindResult(null)
    if (!findCode.trim()) return
    try {
      const q = query(collection(db, 'users'), where('userCode', '==', findCode.toUpperCase()))
      const snap = await getDocs(q)
      if (snap.empty) {
        setFindError('No player found with that code.')
      } else {
        setFindResult({ uid: snap.docs[0].id, ...snap.docs[0].data() })
      }
    } catch (e) { console.error(e); setFindError('Something went wrong.') }
  }

  const handleSignOut = async () => {
    await signOut(auth)
  }

  const handleCopyCode = () => {
    if (userData?.userCode) {
      navigator.clipboard.writeText(userData.userCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const noShowRate = () => {
    const total = (userData?.gamesAttended || 0) + (userData?.noShowCount || 0)
    if (total === 0) return 0
    return Math.round(((userData?.noShowCount || 0) / total) * 100)
  }

  const rate = noShowRate()
  const initial = user?.displayName?.charAt(0)?.toUpperCase() || userData?.name?.charAt(0)?.toUpperCase() || '?'
  const rawTier = getUserTier(userData)
  const currentTier = getEffectiveTier(userData)
  const membershipActive = isMembershipActive(userData)
  const daysLeft = getDaysRemaining(userData)

  // Membership card label and call-to-action text
  const membershipCta = currentTier.id === 'free' ? 'Upgrade' : 'Manage'

  // Expired paid plan warning
  const showExpiredWarning = rawTier.id !== 'free' && !membershipActive

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <span style={styles.wordmark}>Profile</span>
      </header>

      <div style={styles.content}>
        {/* Profile card */}
        <div style={styles.profileCard}>
          {user?.photoURL || userData?.photoURL ? (
            <img src={user?.photoURL || userData?.photoURL} alt="avatar" style={styles.avatarImg} />
          ) : (
            <div style={styles.avatar}>{initial}</div>
          )}

          {/* Name + badge on the same line */}
          <div style={styles.nameRow}>
            <h2 style={styles.name}>{userData?.name || user?.displayName || 'Player'}</h2>
            <MembershipBadge userData={userData} size="md" />
          </div>

          <p style={styles.email}>{user?.email}</p>

          {userData?.userCode && (
            <div style={styles.codeSection}>
              <p style={styles.codeLabel}>Your friend code</p>
              <div style={styles.codeDisplay}>
                <p style={styles.codeValue}>{userData.userCode}</p>
                <button style={styles.copyCodeBtn} onClick={handleCopyCode}>
                  {copied ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
              <p style={styles.codeHint}>Share this code so friends can add you</p>
            </div>
          )}
        </div>

        {/* Membership card */}
        <div style={{
          ...styles.membershipCard,
          borderColor: showExpiredWarning ? '#E0A0A0' : currentTier.id !== 'free' ? '#1D9E75' : '#E0DDD5',
          background: showExpiredWarning ? '#FCEBEB' : currentTier.id !== 'free' ? '#E1F5EE' : 'white',
        }}>
          <div style={styles.membershipLeft}>
            <p style={styles.membershipLabel}>Membership</p>
            <p style={{
              ...styles.membershipTier,
              color: showExpiredWarning ? '#A02020' : currentTier.id !== 'free' ? '#085041' : '#2C2C2A',
            }}>
              {showExpiredWarning ? `${rawTier.name} (expired)` : currentTier.name}
            </p>
            {!showExpiredWarning && currentTier.id !== 'free' && daysLeft > 0 && (
              <p style={styles.membershipDays}>{daysLeft} day{daysLeft === 1 ? '' : 's'} remaining</p>
            )}
            {showExpiredWarning && (
              <p style={styles.membershipExpiredNote}>Renew to restore premium features</p>
            )}
          </div>
          <button style={{
            ...styles.upgradeMembershipBtn,
            background: showExpiredWarning ? '#A02020' : '#1D9E75',
          }} onClick={onShowMembership}>
            {showExpiredWarning ? 'Renew' : membershipCta}
          </button>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={styles.stat}>
            <p style={styles.statValue}>{userData?.gamesAttended || 0}</p>
            <p style={styles.statLabel}>Games</p>
          </div>
          <div style={styles.stat}>
            <p style={styles.statValue}>{userData?.gamesHosted || 0}</p>
            <p style={styles.statLabel}>Hosted</p>
          </div>
          <div style={styles.stat}>
            <p style={{ ...styles.statValue, color: rate > 10 ? '#DC2626' : '#2C2C2A' }}>{rate}%</p>
            <p style={styles.statLabel}>No-show</p>
          </div>
        </div>

        {/* Positions */}
        {userData?.preferredPositions?.length > 0 && (
          <div style={styles.section}>
            <p style={styles.sectionLabel}>Preferred positions</p>
            <div style={styles.positionRow}>
              {userData.preferredPositions.map((p) => (
                <span key={p} style={styles.positionChip}>{p}</span>
              ))}
            </div>
          </div>
        )}

        {/* Friend requests */}
        {friendRequests.length > 0 && (
          <div style={styles.section}>
            <p style={styles.sectionLabel}>Friend requests ({friendRequests.length})</p>
            {friendRequests.map((req) => (
              <div key={req.id} style={styles.requestRow}>
                <div style={styles.requestAvatar}>{req.fromUser?.name?.charAt(0)?.toUpperCase() || '?'}</div>
                <span style={styles.requestName}>{req.fromUser?.name || 'Unknown'}</span>
                <div style={styles.requestBtns}>
                  <button style={styles.acceptBtn} onClick={() => handleAcceptFriend(req)}>Accept</button>
                  <button style={styles.declineBtn} onClick={() => handleDeclineFriend(req)}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friends list */}
        {friends.length > 0 && (
          <div style={styles.section}>
            <p style={styles.sectionLabel}>Friends ({friends.length})</p>
            {friends.map((friend) => (
              <div key={friend.uid} style={styles.friendRow} onClick={() => onViewProfile && onViewProfile(friend.uid)}>
                <div style={styles.friendAvatar}>{friend.name?.charAt(0)?.toUpperCase() || '?'}</div>
                <span style={styles.friendName}>{friend.name}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D3D1C7" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </div>
            ))}
          </div>
        )}

        {/* Find player */}
        <div style={styles.section}>
          <p style={styles.sectionLabel}>Find a player</p>
          <div style={styles.findRow}>
            <input
              style={styles.findInput}
              placeholder="Enter code"
              value={findCode}
              onChange={(e) => setFindCode(e.target.value.toUpperCase().slice(0, 6))}
              maxLength={6}
            />
            <button style={styles.findBtn} onClick={handleFindPlayer}>Find</button>
          </div>
          {findError && <p style={styles.findError}>{findError}</p>}
          {findResult && (
            <div style={styles.findResult} onClick={() => { onViewProfile && onViewProfile(findResult.uid) }}>
              <div style={styles.friendAvatar}>{findResult.name?.charAt(0)?.toUpperCase()}</div>
              <span style={styles.friendName}>{findResult.name}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </div>
          )}
        </div>

        {/* Community */}
        <div style={styles.menuCard}>
          <p style={styles.menuSectionLabel}>Community</p>
          <a href="https://instagram.com/stado.football" target="_blank" rel="noopener noreferrer" style={styles.menuLink}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="1.8"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="#7A7A72" stroke="none" /></svg>
            <span style={styles.menuLabel}>Instagram</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D3D1C7" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </a>
          <div style={styles.menuDivider} />
          <a href="https://youtube.com/@stado.football" target="_blank" rel="noopener noreferrer" style={styles.menuLink}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="1.8"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.45A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.45a2.78 2.78 0 0 0 1.95-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" /><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" stroke="none" fill="#7A7A72" /></svg>
            <span style={styles.menuLabel}>YouTube</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D3D1C7" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </a>
          <div style={styles.menuDivider} />
          <a href="https://discord.gg/m2FQpyvCNe" target="_blank" rel="noopener noreferrer" style={styles.menuLink}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#7A7A72"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            <span style={styles.menuLabel}>Discord</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D3D1C7" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </a>
          <div style={styles.menuDivider} />
          <a href="mailto:stado.football@gmail.com" style={styles.menuLink}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            <span style={styles.menuLabel}>Contact us</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D3D1C7" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </a>
        </div>

        {/* Legal */}
        <div style={styles.menuCard}>
          <p style={styles.menuSectionLabel}>Legal</p>
          <button style={styles.menuItem} onClick={onShowPrivacy}>
            <span style={styles.menuLabel}>Privacy Policy</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D3D1C7" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
          <div style={styles.menuDivider} />
          <button style={styles.menuItem} onClick={onShowTerms}>
            <span style={styles.menuLabel}>Terms of Service</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D3D1C7" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>

        {/* Sign out */}
        <div style={styles.menuCard}>
          <button style={styles.menuItem} onClick={handleSignOut}>
            <span style={{ ...styles.menuLabel, color: '#D63D3D' }}>Sign out</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D3D1C7" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  screen: { flex: 1, display: 'flex', flexDirection: 'column', background: '#F1EFE8' },
  header: { padding: '16px 20px 12px' },
  wordmark: { fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px', color: '#085041' },
  content: { flex: 1, overflowY: 'auto', padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '16px' },

  profileCard: { background: 'white', borderRadius: '16px', padding: '24px 20px', border: '1px solid #E0DDD5', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  avatar: { width: '72px', height: '72px', borderRadius: '50%', background: '#1D9E75', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '700', marginBottom: '12px' },
  avatarImg: { width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', marginBottom: '12px' },

  nameRow: { display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '4px' },
  name: { fontSize: '20px', fontWeight: '700', color: '#2C2C2A', margin: 0 },
  email: { fontSize: '13px', color: '#7A7A72', margin: '0 0 12px' },

  codeSection: { width: '100%', marginTop: '12px' },
  codeLabel: { fontSize: '11px', fontWeight: '600', color: '#888780', textTransform: 'uppercase', margin: '0 0 8px', letterSpacing: '0.5px' },
  codeDisplay: { display: 'flex', alignItems: 'center', gap: '8px', background: '#F1EFE8', borderRadius: '10px', padding: '10px 12px', marginBottom: '6px' },
  codeValue: { flex: 1, fontSize: '16px', fontWeight: '700', letterSpacing: '3px', color: '#085041', margin: 0, textTransform: 'uppercase' },
  copyCodeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  codeHint: { fontSize: '11px', color: '#7A7A72', margin: 0, textAlign: 'center', fontStyle: 'italic' },

  membershipCard: { background: 'white', borderRadius: '16px', padding: '16px', border: '1px solid #E0DDD5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', transition: 'border-color 0.2s' },
  membershipLeft: { display: 'flex', flexDirection: 'column', gap: '2px' },
  membershipLabel: { fontSize: '11px', fontWeight: '600', color: '#888780', textTransform: 'uppercase', margin: 0, letterSpacing: '0.4px' },
  membershipTier: { fontSize: '16px', fontWeight: '700', color: '#2C2C2A', margin: 0 },
  membershipDays: { fontSize: '12px', color: '#1D9E75', margin: 0, fontWeight: '500' },
  membershipExpiredNote: { fontSize: '12px', color: '#A02020', margin: 0, fontWeight: '500' },
  upgradeMembershipBtn: { padding: '9px 16px', background: '#1D9E75', color: 'white', fontSize: '13px', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer', flexShrink: 0 },

  statsRow: { display: 'flex', gap: '8px' },
  stat: { flex: 1, background: 'white', borderRadius: '12px', padding: '12px', border: '1px solid #E0DDD5', textAlign: 'center' },
  statValue: { fontSize: '22px', fontWeight: '700', color: '#2C2C2A', margin: '0 0 4px' },
  statLabel: { fontSize: '11px', color: '#7A7A72', margin: 0 },
  section: { background: 'white', borderRadius: '14px', padding: '16px', border: '1px solid #E0DDD5', display: 'flex', flexDirection: 'column', gap: '10px' },
  sectionLabel: { fontSize: '12px', fontWeight: '600', color: '#888780', margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px' },
  positionRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  positionChip: { background: '#F1EFE8', border: '1.5px solid #E0DDD5', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: '500', color: '#2C2C2A' },
  requestRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  requestAvatar: { width: '36px', height: '36px', borderRadius: '50%', background: '#1D9E75', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0 },
  requestName: { flex: 1, fontSize: '14px', fontWeight: '500', color: '#2C2C2A' },
  requestBtns: { display: 'flex', gap: '8px' },
  acceptBtn: { padding: '6px 12px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  declineBtn: { padding: '6px 12px', background: '#F1EFE8', color: '#7A7A72', border: '1px solid #E0DDD5', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  friendRow: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '4px 0' },
  friendAvatar: { width: '36px', height: '36px', borderRadius: '50%', background: '#E0DDD5', color: '#7A7A72', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0 },
  friendName: { flex: 1, fontSize: '14px', fontWeight: '500', color: '#2C2C2A' },
  findRow: { display: 'flex', gap: '8px' },
  findInput: { flex: 1, padding: '10px 14px', fontSize: '15px', fontWeight: '600', letterSpacing: '4px', background: '#F1EFE8', border: '1px solid #E0DDD5', borderRadius: '10px', outline: 'none', color: '#2C2C2A', textTransform: 'uppercase' },
  findBtn: { padding: '10px 16px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  findError: { fontSize: '13px', color: '#D63D3D', margin: 0 },
  findResult: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px 12px', background: '#F1EFE8', borderRadius: '10px' },
  menuCard: { background: 'white', borderRadius: '14px', border: '1px solid #E0DDD5', overflow: 'hidden' },
  menuSectionLabel: { fontSize: '11px', fontWeight: '600', color: '#888780', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, padding: '12px 16px 4px' },
  menuItem: { width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer' },
  menuLink: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', textDecoration: 'none', color: 'inherit' },
  menuDivider: { height: '1px', background: '#F1EFE8', margin: '0 16px' },
  menuLabel: { flex: 1, textAlign: 'left', fontSize: '15px', fontWeight: '500', color: '#2C2C2A' },
}