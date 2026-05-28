import { useState, useEffect } from 'react'
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'
import MembershipBadge from '../components/membershipBadge'

export default function PublicProfile({ uid, currentUser, onBack, onRequireAuth }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [friendStatus, setFriendStatus] = useState('none') // none | pending | friends
  const [friendRequestId, setFriendRequestId] = useState(null)

  useEffect(() => {
    if (!uid) return
    const fetchProfile = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', uid))
        if (snap.exists()) setProfile(snap.data())
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    fetchProfile()
  }, [uid])

  useEffect(() => {
    if (!currentUser?.uid || !uid) return
    const checkFriendStatus = async () => {
      const mySnap = await getDoc(doc(db, 'users', currentUser.uid))
      if (mySnap.exists()) {
        const myData = mySnap.data()
        if (myData.friends?.includes(uid)) { setFriendStatus('friends'); return }
      }
      const q = query(collection(db, 'friendRequests'),
        where('fromUid', '==', currentUser.uid),
        where('toUid', '==', uid),
        where('status', '==', 'pending')
      )
      const snap = await getDocs(q)
      if (!snap.empty) {
        setFriendStatus('pending')
        setFriendRequestId(snap.docs[0].id)
      }
    }
    checkFriendStatus()
  }, [uid, currentUser])

  const handleAddFriend = async () => {
    if (currentUser?.isAnonymous) {
      onRequireAuth && onRequireAuth()
      return
    }
    try {
      const ref = await addDoc(collection(db, 'friendRequests'), {
        fromUid: currentUser.uid,
        toUid: uid,
        status: 'pending',
        createdAt: new Date(),
      })
      setFriendStatus('pending')
      setFriendRequestId(ref.id)
    } catch (e) { console.error(e) }
  }

  const handleCancelRequest = async () => {
    if (!friendRequestId) return
    try {
      await deleteDoc(doc(db, 'friendRequests', friendRequestId))
      setFriendStatus('none')
      setFriendRequestId(null)
    } catch (e) { console.error(e) }
  }

  const noShowRate = () => {
    if (!profile) return 0
    const total = (profile.gamesAttended || 0) + (profile.noShowCount || 0)
    if (total === 0) return 0
    return Math.round(((profile.noShowCount || 0) / total) * 100)
  }

  const rate = noShowRate()
  const isHighNoShow = rate > 10

  if (loading) {
    return (
      <div style={styles.screen}>
        <header style={styles.header}>
          <button style={styles.backBtn} onClick={onBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2C2C2A" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span style={styles.headerTitle}>Profile</span>
          <div style={styles.headerSpacer} />
        </header>
        <div style={styles.loading}><p style={{ color: '#7A7A72' }}>Loading...</p></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={styles.screen}>
        <header style={styles.header}>
          <button style={styles.backBtn} onClick={onBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2C2C2A" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span style={styles.headerTitle}>Profile</span>
          <div style={styles.headerSpacer} />
        </header>
        <div style={styles.loading}><p style={{ color: '#7A7A72' }}>Player not found.</p></div>
      </div>
    )
  }

  const initial = profile.name?.charAt(0)?.toUpperCase() || '?'

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2C2C2A" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span style={styles.headerTitle}>Player Profile</span>
        <div style={styles.headerSpacer} />
      </header>

      <div style={styles.content}>
        <div style={styles.profileCard}>
          {profile.photoURL ? (
            <img src={profile.photoURL} alt={profile.name} style={styles.avatarImg} />
          ) : (
            <div style={styles.avatar}>{initial}</div>
          )}

          {/* Name + membership badge */}
          <div style={styles.nameRow}>
            <h2 style={styles.name}>{profile.name}</h2>
            <MembershipBadge userData={profile} size="md" />
          </div>

          {profile.userCode && <p style={styles.userCode}>#{profile.userCode}</p>}

          {isHighNoShow && (
            <div style={styles.noShowBadge}>High no-show rate</div>
          )}

          {currentUser?.uid !== uid && (
            <div style={{ marginTop: '12px' }}>
              {friendStatus === 'none' && (
                <button style={styles.friendBtn} onClick={handleAddFriend}>Add friend</button>
              )}
              {friendStatus === 'pending' && (
                <button style={{ ...styles.friendBtn, background: '#E0DDD5', color: '#7A7A72' }} onClick={handleCancelRequest}>
                  Request sent
                </button>
              )}
              {friendStatus === 'friends' && (
                <div style={styles.friendsLabel}>Friends</div>
              )}
            </div>
          )}
        </div>

        <div style={styles.statsRow}>
          <div style={styles.stat}>
            <p style={styles.statValue}>{profile.gamesAttended || 0}</p>
            <p style={styles.statLabel}>Games</p>
          </div>
          <div style={styles.stat}>
            <p style={styles.statValue}>{profile.gamesHosted || 0}</p>
            <p style={styles.statLabel}>Hosted</p>
          </div>
          <div style={styles.stat}>
            <p style={{ ...styles.statValue, color: isHighNoShow ? '#DC2626' : '#2C2C2A' }}>{rate}%</p>
            <p style={styles.statLabel}>No-show</p>
          </div>
        </div>

        {profile.preferredPositions?.length > 0 && (
          <div style={styles.section}>
            <p style={styles.sectionLabel}>Preferred positions</p>
            <div style={styles.positionRow}>
              {profile.preferredPositions.map((p) => (
                <span key={p} style={styles.positionChip}>{p}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  screen: { flex: 1, display: 'flex', flexDirection: 'column', background: '#F1EFE8', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'white', borderBottom: '1px solid #E0DDD5', flexShrink: 0 },
  backBtn: { width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', background: 'none', border: 'none', cursor: 'pointer' },
  headerTitle: { fontSize: '16px', fontWeight: '600', color: '#2C2C2A' },
  headerSpacer: { width: '40px' },
  loading: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' },
  profileCard: { background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #E0DDD5', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  avatar: { width: '80px', height: '80px', borderRadius: '50%', background: '#1D9E75', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '700', margin: '0 auto 12px' },
  avatarImg: { width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '12px' },
  nameRow: { display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '4px' },
  name: { fontSize: '20px', fontWeight: '700', color: '#2C2C2A', margin: 0 },
  userCode: { fontSize: '13px', color: '#7A7A72', margin: '0 0 8px', fontWeight: '500' },
  noShowBadge: { background: '#FCEBEB', color: '#A02020', fontSize: '12px', fontWeight: '600', padding: '4px 12px', borderRadius: '20px', marginTop: '8px' },
  friendBtn: { background: '#1D9E75', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  friendsLabel: { color: '#085041', fontSize: '14px', fontWeight: '600' },
  statsRow: { display: 'flex', gap: '8px' },
  stat: { flex: 1, background: 'white', borderRadius: '12px', padding: '12px', border: '1px solid #E0DDD5', textAlign: 'center' },
  statValue: { fontSize: '20px', fontWeight: '700', color: '#2C2C2A', margin: '0 0 4px' },
  statLabel: { fontSize: '11px', color: '#7A7A72', margin: 0 },
  section: { background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #E0DDD5' },
  sectionLabel: { fontSize: '12px', fontWeight: '600', color: '#888780', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.4px' },
  positionRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  positionChip: { background: '#F1EFE8', border: '1.5px solid #E0DDD5', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: '500', color: '#2C2C2A' },
}