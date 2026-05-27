import { useState, useRef } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const POSITIONS = [
  { id: 'goalkeeper', label: 'Goalkeeper' },
  { id: 'defender', label: 'Defender' },
  { id: 'midfielder', label: 'Midfielder' },
  { id: 'winger', label: 'Winger' },
  { id: 'striker', label: 'Striker' },
]

function generateUserCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return code
}

export default function Onboarding({ onComplete, user }) {
  const [name, setName] = useState(user?.displayName || '')
  const [positions, setPositions] = useState([])
  const [photoURL] = useState(user?.photoURL || null)
  const [loading, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const togglePosition = (id) => {
    setPositions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      const userCode = generateUserCode()
      await setDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        photoURL: user?.photoURL || null,
        email: user?.email || null,
        preferredPositions: positions,
        gamesAttended: 0,
        gamesHosted: 0,
        noShowCount: 0,
        noShowRate: 0,
        friends: [],
        userCode,
        createdAt: new Date(),
      })
      onComplete()
    } catch (err) {
      console.error('Error saving profile:', err)
      setError('Failed to save. Check your connection and try again.')
      setSaving(false)
    }
  }

  return (
    <div style={styles.screen}>
      <div style={styles.content}>
        <h1 style={styles.title}>Complete your profile</h1>
        <p style={styles.subtitle}>Tell us a bit about yourself</p>

        <div style={styles.form}>
          <div style={styles.photoSection}>
            <div style={styles.photoPlaceholder}>
              {photoURL ? (
                <img src={photoURL} alt="Profile" style={styles.photo} />
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="1.5">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                </svg>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Your name</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Preferred positions</label>
            <p style={styles.fieldHint}>Select all that apply</p>
            <div style={styles.positionGrid}>
              {POSITIONS.map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  style={{
                    ...styles.positionBtn,
                    background: positions.includes(pos.id) ? '#E1F5EE' : 'white',
                    borderColor: positions.includes(pos.id) ? '#1D9E75' : '#E0DDD5',
                  }}
                  onClick={() => togglePosition(pos.id)}
                  disabled={loading}
                >
                  <div style={{
                    ...styles.checkbox,
                    background: positions.includes(pos.id) ? '#1D9E75' : 'white',
                    borderColor: positions.includes(pos.id) ? '#1D9E75' : '#C9C6BC',
                  }}>
                    {positions.includes(pos.id) && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    )}
                  </div>
                  <span style={styles.positionLabel}>{pos.label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Get started'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  screen: { flex: 1, display: 'flex', flexDirection: 'column', background: '#F1EFE8', minHeight: '100vh' },
  content: { flex: 1, overflowY: 'auto', padding: '48px 24px 32px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#2C2C2A', marginBottom: '8px', textAlign: 'center' },
  subtitle: { fontSize: '14px', color: '#7A7A72', marginBottom: '32px', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '24px' },
  photoSection: { display: 'flex', justifyContent: 'center' },
  photo: { width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #E0DDD5' },
  photoPlaceholder: { width: '96px', height: '96px', borderRadius: '50%', background: 'white', border: '3px solid #E0DDD5', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '14px', fontWeight: '600', color: '#2C2C2A' },
  fieldHint: { fontSize: '12px', color: '#7A7A72', margin: '0 0 4px' },
  input: { width: '100%', padding: '14px', fontSize: '15px', background: 'white', border: '1px solid #E0DDD5', borderRadius: '12px', outline: 'none', color: '#2C2C2A', boxSizing: 'border-box' },
  positionGrid: { display: 'flex', flexDirection: 'column', gap: '10px' },
  positionBtn: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', border: '1px solid', borderRadius: '12px', cursor: 'pointer' },
  checkbox: { width: '22px', height: '22px', borderRadius: '6px', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  positionLabel: { fontSize: '15px', fontWeight: '500', color: '#2C2C2A' },
  error: { fontSize: '13px', color: '#D63D3D', textAlign: 'center' },
  button: { width: '100%', padding: '14px', background: '#1D9E75', color: 'white', fontSize: '15px', fontWeight: '600', borderRadius: '12px', border: 'none', cursor: 'pointer' },
}