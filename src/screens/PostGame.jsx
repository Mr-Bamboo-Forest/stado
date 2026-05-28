import { useState, useEffect } from 'react'
import { collection, addDoc, increment, doc, updateDoc } from 'firebase/firestore'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { db } from '../firebase'
import { canPostGame, hasFeature } from '../membershipUtils'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const FORMATS = ['5-a-side', '6-a-side', '7-a-side', '11-a-side']
const SKILLS = ['Any level', 'Casual', 'Intermediate', 'Competitive']
const BRISBANE_CENTER = [-27.4698, 153.0251]

function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
    },
  })
  return position ? <Marker position={position} /> : null
}

function MapController({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, 14)
  }, [center, map])
  return null
}

export default function PostGame({ onBack, currentUser, userData, onShowMembership }) {
  const [form, setForm] = useState({
    name: '', format: '5-a-side', location: '',
    lat: null, lng: null, date: '', time: '',
    spots: '10', skill: 'Any level', note: '', isPublic: true,
    isRecurring: false, recurringDays: [],
  })
  const [mapPosition, setMapPosition] = useState(BRISBANE_CENTER)
  const [submitting, setSubmitting] = useState(false)
  const [postedCode, setPostedCode] = useState(null)
  const [copied, setCopied] = useState(false)
  const [postResult, setPostResult] = useState(null)
  const [postError, setPostError] = useState('')
  const [showLimitModal, setShowLimitModal] = useState(false)

  const postStatus = canPostGame(userData)
  const canPost = postStatus.canPost
  const canUseRecurring = hasFeature(userData, 'recurringGames')

  useEffect(() => {
    if (mapPosition) {
      setForm((prev) => ({ ...prev, lat: mapPosition[0], lng: mapPosition[1] }))
    }
  }, [mapPosition])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setMapPosition([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    )
  }

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const generateJoinCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
    return code
  }

  const isFormValid = !!(form.name.trim() && form.date && form.time && form.location && form.lat && form.lng)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Check if can post
    if (!canPost) {
      setShowLimitModal(true)
      return
    }

    if (form.isRecurring && !canUseRecurring) {
      setPostError('Recurring games are available for Regular members only. Upgrade your membership to schedule recurring sessions.')
      return
    }

    if (!isFormValid) return
    setSubmitting(true)
    try {
      const joinCode = form.isPublic ? null : generateJoinCode()
      const playerName = userData?.name || currentUser?.displayName || 'Host'
      const playerPhoto = userData?.photoURL || currentUser?.photoURL || null

      await addDoc(collection(db, 'games'), {
        name: form.name, format: form.format, location: form.location,
        lat: form.lat, lng: form.lng, distance: '',
        date: form.date, time: form.time,
        spotsTotal: parseInt(form.spots, 10),
        spotsRemaining: parseInt(form.spots, 10) - 1,
        host: playerName, hostUid: currentUser.uid, hostPhotoURL: playerPhoto,
        skill: form.skill, note: form.note || '',
        players: [{ uid: currentUser.uid, name: playerName, photoURL: playerPhoto }],
        isPublic: form.isPublic, joinCode,
        isRecurring: form.isRecurring,
        recurringDays: form.isRecurring ? form.recurringDays : [],
        createdAt: new Date(),
      })

      // Increment games hosted
      await updateDoc(doc(db, 'users', currentUser.uid), { 
        gamesHosted: increment(1),
        monthlyPostsUsed: increment(1),
      })

      // Show success modal
      setPostResult('success')
      setSubmitting(false)

      // If private, show code. Otherwise, go back after delay
      if (!form.isPublic && joinCode) {
        setTimeout(() => {
          setPostResult(null)
          setPostedCode(joinCode)
        }, 2000)
      } else {
        setTimeout(() => {
          setPostResult(null)
          onBack()
        }, 2000)
      }
    } catch (error) {
      console.error('Error adding game:', error)
      setPostError(error.message || 'Failed to post game')
      setPostResult('error')
      setSubmitting(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(postedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = () => {
    window.open(`https://wa.me/?text=Join my Stado game! Use code: ${postedCode} at stado-eight.vercel.app`, '_blank')
  }

  if (postedCode) {
    return (
      <div style={styles.screen}>
        <div style={styles.codeScreen}>
          <div style={styles.codeIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 style={styles.codeTitle}>Game posted!</h2>
          <p style={styles.codeSubtitle}>Share this code with your players</p>

          <div style={styles.codeBox}>
            <p style={styles.codeValue}>{postedCode}</p>
          </div>

          <button style={styles.copyBtn} onClick={handleCopy}>
            {copied ? '✓ Copied!' : 'Copy code'}
          </button>

          <button style={styles.shareBtn} onClick={handleShare}>
            Share via WhatsApp
          </button>

          <button style={styles.doneBtn} onClick={onBack}>
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2C2C2A" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span style={styles.headerTitle}>Post a game</span>
        <div style={styles.headerSpacer} />
      </header>

      <div style={styles.content}>
        {/* Usage info */}
        <div style={styles.usageCard}>
          <div style={styles.usageContent}>
            <p style={styles.usageLabel}>Games posted this month</p>
            <p style={styles.usageValue}>
              {postStatus.postsUsed}/{postStatus.postsRemaining === Infinity ? '∞' : postStatus.postsRemaining}
            </p>
          </div>
          {!canPost && (
            <button style={styles.upgradeBtn} onClick={onShowMembership}>
              Upgrade to post more
            </button>
          )}
        </div>

        {!canPost && (
          <div style={styles.limitBanner}>
            <p style={styles.limitBannerText}>
              📊 You've reached your monthly posting limit. Upgrade to post unlimited games.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Game name */}
          <div style={styles.field}>
            <label style={styles.label}>Game name</label>
            <input
              style={styles.input}
              placeholder="e.g. Weekend kickabout"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Format & Skill */}
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Format</label>
              <select style={styles.select} value={form.format} onChange={(e) => handleChange('format', e.target.value)} disabled={submitting}>
                {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Skill level</label>
              <select style={styles.select} value={form.skill} onChange={(e) => handleChange('skill', e.target.value)} disabled={submitting}>
                {SKILLS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Location picker */}
          <div style={styles.field}>
            <label style={styles.label}>Location</label>
            <div style={styles.mapWrapper}>
              <MapContainer center={mapPosition} zoom={14} style={styles.mapContainer}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker position={mapPosition} setPosition={setMapPosition} />
                <MapController center={mapPosition} />
              </MapContainer>
            </div>
            <button type="button" style={styles.locationBtn} onClick={getCurrentLocation}>
              📍 Use my location
            </button>
            <input
              style={styles.input}
              placeholder="Location name (required)"
              value={form.location}
              onChange={(e) => handleChange('location', e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Date & Time */}
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Date</label>
              <input style={styles.input} type="date" value={form.date} onChange={(e) => handleChange('date', e.target.value)} disabled={submitting} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Time</label>
              <input style={styles.input} type="time" value={form.time} onChange={(e) => handleChange('time', e.target.value)} disabled={submitting} />
            </div>
          </div>

          {/* Spots */}
          <div style={styles.field}>
            <label style={styles.label}>Total spots</label>
            <input
              style={styles.input}
              type="number"
              min="1"
              max="30"
              value={form.spots}
              onChange={(e) => handleChange('spots', e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Public/Private */}
          <div style={styles.field}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(e) => handleChange('isPublic', e.target.checked)}
                disabled={submitting}
                style={styles.checkbox}
              />
              Public game (visible on map)
            </label>
            <p style={styles.fieldHint}>Private games are shared via code only</p>
          </div>

          {/* Recurring (Premium) */}
          <div style={styles.field}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.isRecurring}
                onChange={(e) => handleChange('isRecurring', e.target.checked)}
                disabled={submitting || !canUseRecurring}
                style={styles.checkbox}
              />
              Schedule recurring game
            </label>
            {!canUseRecurring && (
              <p style={styles.fieldHint}>
                Premium feature available only for Regular members. Upgrade to enable recurring games.
              </p>
            )}
          </div>

          {/* Note */}
          <div style={styles.field}>
            <label style={styles.label}>Additional notes (optional)</label>
            <textarea
              style={styles.textarea}
              placeholder="e.g. bring your own football, parking available..."
              value={form.note}
              onChange={(e) => handleChange('note', e.target.value)}
              disabled={submitting}
              rows="3"
            />
          </div>

          {postError && <p style={styles.error}>{postError}</p>}

          <button
            type="submit"
            style={{ ...styles.button, opacity: (submitting || !canPost) ? 0.7 : 1 }}
            disabled={submitting || !canPost}
          >
            {submitting ? 'Posting...' : !canPost ? 'Limit reached - Upgrade to post' : 'Post game'}
          </button>
        </form>
      </div>

      {/* Limit Modal */}
      {showLimitModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                <path d="M12 2v20M2 12h20" />
              </svg>
            </div>
            <h3 style={styles.modalTitle}>Monthly limit reached</h3>
            <p style={styles.modalText}>
              You've posted {postStatus.postsRemaining} games this month. Upgrade to post unlimited games.
            </p>
            <div style={styles.modalButtons}>
              <button style={styles.modalCancel} onClick={() => setShowLimitModal(false)}>
                Maybe later
              </button>
              <button style={styles.modalConfirm} onClick={onShowMembership}>
                Upgrade membership
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  screen: { flex: 1, display: 'flex', flexDirection: 'column', background: '#F1EFE8', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'white', borderBottom: '1px solid #E0DDD5', flexShrink: 0 },
  backBtn: { width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', background: 'none', border: 'none', cursor: 'pointer' },
  headerTitle: { fontSize: '16px', fontWeight: '600', color: '#2C2C2A' },
  headerSpacer: { width: '40px' },
  content: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' },
  usageCard: { background: 'white', borderRadius: '12px', padding: '14px', border: '1px solid #E0DDD5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' },
  usageContent: { flex: 1 },
  usageLabel: { fontSize: '11px', fontWeight: '600', color: '#888780', textTransform: 'uppercase', margin: 0, marginBottom: '4px' },
  usageValue: { fontSize: '18px', fontWeight: '700', color: '#2C2C2A', margin: 0 },
  upgradeBtn: { padding: '8px 12px', background: '#1D9E75', color: 'white', fontSize: '12px', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' },
  limitBanner: { background: '#FCEBEB', border: '1px solid #DC2626', borderRadius: '10px', padding: '12px' },
  limitBannerText: { fontSize: '13px', color: '#A02020', fontWeight: '500', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#2C2C2A' },
  input: { width: '100%', padding: '12px 14px', fontSize: '15px', background: 'white', border: '1px solid #E0DDD5', borderRadius: '10px', outline: 'none', color: '#2C2C2A', boxSizing: 'border-box' },
  select: { width: '100%', padding: '12px 14px', fontSize: '15px', background: 'white', border: '1px solid #E0DDD5', borderRadius: '10px', outline: 'none', color: '#2C2C2A', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '12px 14px', fontSize: '15px', background: 'white', border: '1px solid #E0DDD5', borderRadius: '10px', outline: 'none', color: '#2C2C2A', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none' },
  mapWrapper: { width: '100%', height: '200px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E0DDD5' },
  mapContainer: { height: '100%', width: '100%' },
  locationBtn: { padding: '10px', background: '#E1F5EE', color: '#085041', border: '1px solid #A8D8CF', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  fieldHint: { fontSize: '12px', color: '#7A7A72', margin: 0 },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '500', color: '#2C2C2A', cursor: 'pointer' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer' },
  error: { fontSize: '13px', color: '#D63D3D', background: '#FCEBEB', padding: '10px 12px', borderRadius: '8px', margin: 0 },
  button: { width: '100%', padding: '14px 0', background: '#1D9E75', color: 'white', fontSize: '15px', fontWeight: '600', borderRadius: '10px', border: 'none', cursor: 'pointer' },
  codeScreen: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: '24px', textAlign: 'center' },
  codeIcon: { width: '80px', height: '80px', borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  codeTitle: { fontSize: '24px', fontWeight: '700', color: '#2C2C2A', margin: 0 },
  codeSubtitle: { fontSize: '15px', color: '#7A7A72', margin: 0 },
  codeBox: { background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #E0DDD5', width: '100%' },
  codeValue: { fontSize: '32px', fontWeight: '700', letterSpacing: '6px', color: '#085041', margin: 0 },
  copyBtn: { width: '100%', padding: '12px 0', background: '#1D9E75', color: 'white', fontSize: '15px', fontWeight: '600', borderRadius: '10px', border: 'none', cursor: 'pointer' },
  shareBtn: { width: '100%', padding: '12px 0', background: 'white', color: '#1D9E75', fontSize: '15px', fontWeight: '600', borderRadius: '10px', border: '2px solid #1D9E75', cursor: 'pointer' },
  doneBtn: { width: '100%', padding: '12px 0', background: '#F1EFE8', color: '#7A7A72', fontSize: '15px', fontWeight: '600', borderRadius: '10px', border: 'none', cursor: 'pointer' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1000 },
  modal: { background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '320px', textAlign: 'center' },
  modalIcon: { display: 'flex', justifyContent: 'center', marginBottom: '16px' },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#2C2C2A', margin: 0, marginBottom: '12px' },
  modalText: { fontSize: '14px', color: '#555550', margin: 0, marginBottom: '20px' },
  modalButtons: { display: 'flex', gap: '12px' },
  modalCancel: { flex: 1, padding: '12px', background: 'white', color: '#555550', fontSize: '15px', fontWeight: '600', borderRadius: '10px', border: '1px solid #E0DDD5', cursor: 'pointer' },
  modalConfirm: { flex: 1, padding: '12px', background: '#1D9E75', color: 'white', fontSize: '15px', fontWeight: '600', borderRadius: '10px', border: 'none', cursor: 'pointer' },
}