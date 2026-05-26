import { useState, useRef } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage, db } from '../firebase'

const POSITIONS = [
  { id: 'goalkeeper', label: 'Goalkeeper' },
  { id: 'defender', label: 'Defender' },
  { id: 'midfielder', label: 'Midfielder' },
  { id: 'winger', label: 'Winger' },
  { id: 'striker', label: 'Striker' },
]

export default function Onboarding({ onComplete, user }) {
  const [name, setName] = useState(user?.displayName || '')
  const [positions, setPositions] = useState([])
  const [photoURL, setPhotoURL] = useState(user?.photoURL || null)
  const [photoFile, setPhotoFile] = useState(null)
  const [loading, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  const togglePosition = (id) => {
    setPositions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      setPhotoURL(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      let finalPhotoURL = user?.photoURL || null

      if (photoFile) {
        const storageRef = ref(storage, `users/${user.uid}/avatar`)
        await uploadBytes(storageRef, photoFile)
        finalPhotoURL = await getDownloadURL(storageRef)
      }

      await setDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        photoURL: finalPhotoURL,
        phone: user?.phoneNumber || null,
        email: user?.email || null,
        preferredPositions: positions,
        gamesAttended: 0,
        gamesHosted: 0,
        createdAt: new Date(),
      })
      onComplete()
    } catch (err) {
      console.error('Error saving profile:', err)
      alert('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.screen}>
      <div style={styles.content}>
        <h1 style={styles.title}>Complete your profile</h1>
        <p style={styles.subtitle}>Tell us a bit about yourself</p>

        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.photoSection}>
            <button
              type="button"
              style={styles.photoBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              {photoURL ? (
                <img src={photoURL} alt="Profile" style={styles.photo} />
              ) : (
                <div style={styles.photoPlaceholder}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="1.5">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                  </svg>
                </div>
              )}
              <span style={styles.photoLabel}>Add photo</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
          </div>

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
                  <div
                    style={{
                      ...styles.checkbox,
                      background: positions.includes(pos.id) ? '#1D9E75' : 'white',
                      borderColor: positions.includes(pos.id) ? '#1D9E75' : '#C9C6BC',
                    }}
                  >
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

          <button style={{ ...styles.button, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
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
  },
  photoSection: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  photoBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  photo: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #E0DDD5',
  },
  photoPlaceholder: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    background: 'white',
    border: '3px solid #E0DDD5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#1D9E75',
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
  checkbox: {
    width: '22px',
    height: '22px',
    borderRadius: '6px',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
