import { useState, useEffect } from 'react'
import { collection, addDoc, increment, doc, updateDoc } from 'firebase/firestore'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { db } from '../firebase'

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

export default function PostGame({ onBack, currentUser, userData }) {
  const [form, setForm] = useState({
    name: '', format: '5-a-side', location: '',
    lat: null, lng: null, date: '', time: '',
    spots: '10', skill: 'Any level', note: '', isPublic: true,
  })
  const [mapPosition, setMapPosition] = useState(BRISBANE_CENTER)
  const [submitting, setSubmitting] = useState(false)
  const [postedCode, setPostedCode] = useState(null)
  const [copied, setCopied] = useState(false)
  const [postResult, setPostResult] = useState(null) // 'success' or 'error'
  const [postError, setPostError] = useState('')

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
        createdAt: new Date(),
      })

      await updateDoc(doc(db, 'users', currentUser.uid), { gamesHosted: increment(1) })

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

          <button style={styles.whatsappBtn} onClick={handleShare}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.507 3.934 1.395 5.608L0 24l6.538-1.376A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.001-1.368l-.36-.213-3.877.816.825-3.78-.233-.375A9.818 9.818 0 1 1 12 21.818z" />
            </svg>
            Share via WhatsApp
          </button>

          <button style={styles.doneBtn} onClick={onBack}>Done</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.closeBtn} onClick={onBack} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2C2C2A" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <span style={styles.headerTitle}>Post a game</span>
        <div style={styles.headerSpacer} />
      </header>

      <form style={styles.form} onSubmit={handleSubmit}>
        <div style={styles.field}>
          <label style={styles.label}>Game name <span style={styles.required}>* Required</span></label>
          <input style={styles.input} type="text" placeholder="e.g. South Bank Sunday Kickaround"
            value={form.name} onChange={(e) => handleChange('name', e.target.value)} required disabled={submitting} />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Format</label>
          <div style={styles.formatGrid}>
            {FORMATS.map((f) => (
              <button key={f} type="button" style={{
                ...styles.formatBtn,
                background: form.format === f ? '#085041' : 'white',
                color: form.format === f ? 'white' : '#2C2C2A',
                borderColor: form.format === f ? '#085041' : '#E0DDD5',
              }} onClick={() => handleChange('format', f)} disabled={submitting}>{f}</button>
            ))}
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Date <span style={styles.required}>* Required</span></label>
            <input style={{ ...styles.input, ...styles.inputSmall }} type="date"
              value={form.date} onChange={(e) => handleChange('date', e.target.value)} required disabled={submitting} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Time <span style={styles.required}>* Required</span></label>
            <input style={{ ...styles.input, ...styles.inputSmall }} type="time"
              value={form.time} onChange={(e) => handleChange('time', e.target.value)} required disabled={submitting} />
          </div>
        </div>

        <div style={styles.field}>
          <div style={styles.locationHeader}>
            <label style={styles.label}>Location <span style={styles.required}>* Required</span></label>
            <button type="button" style={styles.locationBtn} onClick={getCurrentLocation} disabled={submitting}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
              </svg>
              Use current
            </button>
          </div>
          <input style={styles.input} type="text" placeholder="Park name (e.g. South Bank Parklands)"
            value={form.location} onChange={(e) => handleChange('location', e.target.value)} required disabled={submitting} />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Pin location on map <span style={styles.required}>* Required</span></label>
          <p style={styles.hint}>Tap the map to set exact location</p>
          <div style={styles.mapContainer}>
            <MapContainer center={BRISBANE_CENTER} zoom={13} style={styles.map} scrollWheelZoom={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController center={mapPosition} />
              <LocationPicker position={mapPosition} setPosition={setMapPosition} />
            </MapContainer>
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Total spots</label>
            <select style={{ ...styles.input, ...styles.inputSmall }} value={form.spots}
              onChange={(e) => handleChange('spots', e.target.value)} disabled={submitting}>
              {[6, 8, 10, 12, 14, 16, 18, 22].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Skill level</label>
            <select style={{ ...styles.input, ...styles.inputSmall }} value={form.skill}
              onChange={(e) => handleChange('skill', e.target.value)} disabled={submitting}>
              {SKILLS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Visibility</label>
          <div style={styles.visibilityRow}>
            <button type="button" style={{
              ...styles.visibilityBtn,
              background: form.isPublic ? '#E1F5EE' : 'white',
              borderColor: form.isPublic ? '#1D9E75' : '#E0DDD5',
            }} onClick={() => handleChange('isPublic', true)} disabled={submitting}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={form.isPublic ? '#1D9E75' : '#7A7A72'} strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
              </svg>
              Public
            </button>
            <button type="button" style={{
              ...styles.visibilityBtn,
              background: !form.isPublic ? '#E1F5EE' : 'white',
              borderColor: !form.isPublic ? '#1D9E75' : '#E0DDD5',
            }} onClick={() => handleChange('isPublic', false)} disabled={submitting}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={!form.isPublic ? '#1D9E75' : '#7A7A72'} strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Private
            </button>
          </div>
          {!form.isPublic && <p style={styles.hint}>Only people with your join code can see this game</p>}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Note (optional)</label>
          <textarea style={styles.textarea} placeholder="Any extra info for players..."
            value={form.note} onChange={(e) => handleChange('note', e.target.value)} rows={3} disabled={submitting} />
        </div>

        <button
          style={{ ...styles.submitBtn, opacity: submitting || !isFormValid ? 0.4 : 1, cursor: isFormValid ? 'pointer' : 'not-allowed' }}
          type="submit"
          disabled={submitting || !isFormValid}
        >
          {submitting ? 'Posting...' : 'Post game'}
        </button>

        {/* Success Modal */}
        {postResult === 'success' && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h3 style={styles.modalTitle}>Game posted successfully!</h3>
              <p style={styles.modalMessage}>Your game is now live. Players can find and join it.</p>
            </div>
          </div>
        )}

        {/* Error Modal */}
        {postResult === 'error' && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalIconError}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 style={styles.modalTitle}>Failed to post game</h3>
              <p style={styles.modalMessage}>Please check your connection and try again.</p>
              <button 
                style={styles.modalRetryBtn}
                onClick={() => setPostResult(null)}
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

const styles = {
  screen: { flex: 1, display: 'flex', flexDirection: 'column', background: '#F1EFE8' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'white', borderBottom: '1px solid #E0DDD5', flexShrink: 0 },
  closeBtn: { width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', background: 'none', border: 'none', cursor: 'pointer' },
  headerTitle: { fontSize: '16px', fontWeight: '600', color: '#2C2C2A' },
  headerSpacer: { width: '40px' },
  form: { flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#2C2C2A' },
  hint: { fontSize: '12px', color: '#7A7A72', marginTop: '-2px' },
  input: { width: '100%', padding: '12px 14px', fontSize: '15px', background: 'white', border: '1px solid #E0DDD5', borderRadius: '10px', color: '#2C2C2A', outline: 'none', boxSizing: 'border-box' },
  inputSmall: { width: 'auto' },
  textarea: { width: '100%', padding: '12px 14px', fontSize: '15px', background: 'white', border: '1px solid #E0DDD5', borderRadius: '10px', color: '#2C2C2A', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  row: { display: 'flex', gap: '12px' },
  formatGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' },
  formatBtn: { padding: '10px 0', fontSize: '14px', fontWeight: '500', borderRadius: '10px', border: '1px solid', cursor: 'pointer' },
  locationHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  locationBtn: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '500', color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' },
  mapContainer: { width: '100%', height: '200px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E0DDD5' },
  map: { height: '200px', width: '100%' },
  visibilityRow: { display: 'flex', gap: '10px' },
  visibilityBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '14px', fontWeight: '500', borderRadius: '10px', border: '1px solid', cursor: 'pointer', color: '#2C2C2A' },
  submitBtn: { width: '100%', padding: '14px 0', background: '#1D9E75', color: 'white', fontSize: '15px', fontWeight: '600', borderRadius: '12px', border: 'none', cursor: 'pointer', marginTop: 'auto' },
  codeScreen: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: '16px', textAlign: 'center' },
  codeIcon: { width: '72px', height: '72px', borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  codeTitle: { fontSize: '26px', fontWeight: '700', color: '#2C2C2A', margin: 0 },
  codeSubtitle: { fontSize: '15px', color: '#7A7A72', margin: 0 },
  codeBox: { background: 'white', border: '2px solid #E0DDD5', borderRadius: '16px', padding: '20px 40px', marginTop: '8px' },
  codeValue: { fontSize: '36px', fontWeight: '700', letterSpacing: '10px', color: '#085041', margin: 0 },
  copyBtn: { width: '100%', maxWidth: '280px', padding: '14px', background: '#085041', color: 'white', fontSize: '15px', fontWeight: '600', borderRadius: '12px', border: 'none', cursor: 'pointer' },
  whatsappBtn: { width: '100%', maxWidth: '280px', padding: '14px', background: '#25D366', color: 'white', fontSize: '15px', fontWeight: '600', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  doneBtn: { background: 'none', border: 'none', color: '#7A7A72', fontSize: '15px', fontWeight: '500', cursor: 'pointer', padding: '8px', textDecoration: 'underline', textDecorationColor: '#C9C6BC' },
  required: { fontSize: '11px', fontWeight: '600', color: '#D63D3D', marginLeft: '4px' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1000 },
  modalContent: { background: 'white', borderRadius: '20px', padding: '40px 24px', width: '100%', maxWidth: '300px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', animation: 'slideUp 0.4s ease-out' },
  modalIcon: { width: '64px', height: '64px', borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalIconError: { width: '64px', height: '64px', borderRadius: '50%', background: '#D63D3D', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#2C2C2A', margin: 0 },
  modalMessage: { fontSize: '14px', color: '#7A7A72', margin: 0, lineHeight: '1.5' },
  modalRetryBtn: { marginTop: '8px', padding: '12px 24px', background: '#1D9E75', color: 'white', fontSize: '14px', fontWeight: '600', borderRadius: '10px', border: 'none', cursor: 'pointer' },
}

// Add animation keyframes
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `
  document.head.appendChild(style)
}