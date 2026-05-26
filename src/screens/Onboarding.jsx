import { useState } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { ensureUserCode } from '../utils/social'

const POSITIONS = [
  { id: 'goalkeeper', label: 'Goalkeeper', icon: 'GK' },
  { id: 'defender', label: 'Defender', icon: 'CB' },
  { id: 'midfielder', label: 'Midfielder', icon: 'CM' },
  { id: 'winger', label: 'Winger', icon: 'LW' },
  { id: 'striker', label: 'Striker', icon: 'ST' },
]

export default function Onboarding({ onComplete }) {
  const [name, setName] = useState('')
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(false)

  const togglePosition = (id) => {
    setPositions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const user = auth.currentUser
      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          name: name.trim(),
          email: user.email,
          photoURL: user.photoURL || null,
          phone: user.phoneNumber || null,
          preferredPositions: positions,
          gamesAttended: 0,
          gamesHosted: 0,
          noShowRate: 0,
          noShowCount: 0,
          noShowTotal: 0,
          friendUids: [],
          profilePublic: true,
          createdAt: new Date(),
        })
        await ensureUserCode(user.uid)
      }
      onComplete()
    } catch (err) {
      console.error('Error saving profile:', err)
      alert('Failed to save profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.screen}>
      <div style={styles.content}>
        <span style={styles.wordmark}>stado</span>
        <h1 style={styles.title}>Complete your profile</h1>
        <p style={styles.subtitle}>Tell us a bit about yourself</p>

        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Your name</label>
            <input
              style={styles.input}
              type="text"
              placeholder="James Davidson"
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
                  <span style={{
                    ...styles.positionIcon,
                    background: positions.includes(pos.id) ? '#1D9E75' : '#E0DDD5',
                    color: positions.includes(pos.id) ? 'white' : '#7A7A72',
                  }}>
                    {pos.icon}
                  </span>
                  <span style={styles.positionLabel}>{pos.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Get started'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  screen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#F1EFE8',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '48px 24px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  wordmark: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#085041',
    letterSpacing: '-0.5px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#2C2C2A',
    marginBottom: '8px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '14px',
    color: '#7A7A72',
    marginBottom: '32px',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '100%',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2C2C2A',
  },
  fieldHint: {
    fontSize: '12px',
    color: '#7A7A72',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    padding: '14px',
    fontSize: '15px',
    background: 'white',
    border: '1px solid #E0DDD5',
    borderRadius: '12px',
    outline: 'none',
    color: '#2C2C2A',
    boxSizing: 'border-box',
  },
  positionGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  positionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    background: 'white',
    border: '1px solid',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  positionIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.02em',
  },
  positionLabel: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#2C2C2A',
  },
  button: {
    width: '100%',
    padding: '14px',
    background: '#1D9E75',
    color: 'white',
    fontSize: '15px',
    fontWeight: '600',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    marginTop: '16px',
  },
}