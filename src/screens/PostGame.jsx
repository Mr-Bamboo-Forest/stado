import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, serverTimestamp, increment, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

const FORMATS = ['5-a-side', '6-a-side', '7-a-side', '11-a-side']
const SKILLS = ['Any level', 'Casual', 'Intermediate', 'Competitive']

export default function PostGame({ onBack, currentUser, userData }) {
  const [form, setForm] = useState({
    name: '',
    format: '5-a-side',
    location: '',
    lat: null,
    lng: null,
    date: '',
    time: '',
    spots: '10',
    skill: 'Any level',
    note: '',
    isPublic: true,
    joinCode: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [useCurrentLocation, setUseCurrentLocation] = useState(false)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (!window.google?.maps) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`
      script.async = true
      script.onload = initMap
      document.head.appendChild(script)
      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script)
        }
      }
    } else {
      initMap()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initMap = () => {
    if (!mapRef.current || !window.google?.maps) return

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: -27.4698, lng: 153.0251 },
      zoom: 13,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    })

    markerRef.current = new window.google.maps.Marker({
      map,
      position: { lat: -27.4698, lng: 153.0251 },
      draggable: true,
      title: 'Drag to set location',
    })

    map.addListener('click', (e) => {
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()
      markerRef.current.setPosition({ lat, lng })
      setForm((prev) => ({ ...prev, lat, lng }))
    })

    markerRef.current.addListener('dragend', () => {
      const pos = markerRef.current.getPosition()
      setForm((prev) => ({
        ...prev,
        lat: pos.lat(),
        lng: pos.lng(),
      }))
    })

    setForm((prev) => ({
      ...prev,
      lat: -27.4698,
      lng: 153.0251,
    }))
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        if (window.google?.maps && mapRef.current) {
          const map = new window.google.maps.Map(mapRef.current, {
            center: { lat, lng },
            zoom: 13,
          })
          if (markerRef.current) {
            markerRef.current.setMap(null)
          }
          markerRef.current = new window.google.maps.Marker({
            map,
            position: { lat, lng },
            draggable: true,
          })
        }

        setForm((prev) => ({ ...prev, lat, lng }))
        setUseCurrentLocation(true)
      },
      () => {
        alert('Unable to retrieve your location')
      }
    )
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const generateJoinCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const joinCode = form.isPublic ? null : generateJoinCode()

      const playerName = userData?.name || currentUser?.displayName || 'Host'
      const playerPhoto = userData?.photoURL || currentUser?.photoURL || null

      await addDoc(collection(db, 'games'), {
        name: form.name,
        format: form.format,
        location: form.location,
        lat: form.lat,
        lng: form.lng,
        distance: '',
        date: form.date,
        time: form.time,
        spotsTotal: parseInt(form.spots, 10),
        spotsRemaining: parseInt(form.spots, 10) - 1,
        host: playerName,
        hostUid: currentUser.uid,
        hostPhotoURL: playerPhoto,
        skill: form.skill,
        note: form.note || '',
        players: [{
          uid: currentUser.uid,
          name: playerName,
          photoURL: playerPhoto,
        }],
        isPublic: form.isPublic,
        joinCode,
        createdAt: serverTimestamp(),
      })

      await updateDoc(doc(db, 'users', currentUser.uid), {
        gamesHosted: increment(1),
      })

      onBack()
    } catch (error) {
      console.error('Error adding game:', error)
      alert('Failed to post game. Please try again.')
    } finally {
      setSubmitting(false)
    }
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
          <label style={styles.label}>Game name</label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. South Bank Sunday Kickaround"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            disabled={submitting}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Format</label>
          <div style={styles.formatGrid}>
            {FORMATS.map((f) => (
              <button
                key={f}
                type="button"
                style={{
                  ...styles.formatBtn,
                  background: form.format === f ? '#085041' : 'white',
                  color: form.format === f ? 'white' : '#2C2C2A',
                  borderColor: form.format === f ? '#085041' : '#E0DDD5',
                }}
                onClick={() => handleChange('format', f)}
                disabled={submitting}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Date</label>
            <input
              style={{ ...styles.input, ...styles.inputSmall }}
              type="date"
              value={form.date}
              onChange={(e) => handleChange('date', e.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Time</label>
            <input
              style={{ ...styles.input, ...styles.inputSmall }}
              type="time"
              value={form.time}
              onChange={(e) => handleChange('time', e.target.value)}
              required
              disabled={submitting}
            />
          </div>
        </div>

        <div style={styles.field}>
          <div style={styles.locationHeader}>
            <label style={styles.label}>Location</label>
            <button
              type="button"
              style={styles.locationBtn}
              onClick={getCurrentLocation}
              disabled={submitting}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
              </svg>
              Use current
            </button>
          </div>
          <input
            style={styles.input}
            type="text"
            placeholder="Park or field name (e.g. South Bank Parklands)"
            value={form.location}
            onChange={(e) => handleChange('location', e.target.value)}
            required
            disabled={submitting}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Pin location on map</label>
          <p style={styles.hint}>Tap or drag the marker to set exact location</p>
          <div ref={mapRef} style={styles.map}></div>
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Total spots</label>
            <select
              style={{ ...styles.input, ...styles.inputSmall }}
              value={form.spots}
              onChange={(e) => handleChange('spots', e.target.value)}
              disabled={submitting}
            >
              {[6, 8, 10, 12, 14, 16, 18, 22].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Skill level</label>
            <select
              style={{ ...styles.input, ...styles.inputSmall }}
              value={form.skill}
              onChange={(e) => handleChange('skill', e.target.value)}
              disabled={submitting}
            >
              {SKILLS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Visibility</label>
          <div style={styles.visibilityRow}>
            <button
              type="button"
              style={{
                ...styles.visibilityBtn,
                background: form.isPublic ? '#E1F5EE' : 'white',
                borderColor: form.isPublic ? '#1D9E75' : '#E0DDD5',
              }}
              onClick={() => handleChange('isPublic', true)}
              disabled={submitting}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={form.isPublic ? '#1D9E75' : '#7A7A72'} strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Public
            </button>
            <button
              type="button"
              style={{
                ...styles.visibilityBtn,
                background: !form.isPublic ? '#E1F5EE' : 'white',
                borderColor: !form.isPublic ? '#1D9E75' : '#E0DDD5',
              }}
              onClick={() => handleChange('isPublic', false)}
              disabled={submitting}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={!form.isPublic ? '#1D9E75' : '#7A7A72'} strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Private
            </button>
          </div>
          {!form.isPublic && (
            <p style={styles.hint}>Only people with your join code can see this game</p>
          )}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Note (optional)</label>
          <textarea
            style={styles.textarea}
            placeholder="Any extra info for players..."
            value={form.note}
            onChange={(e) => handleChange('note', e.target.value)}
            rows={3}
            disabled={submitting}
          />
        </div>

        <button style={{ ...styles.submitBtn, opacity: submitting ? 0.7 : 1 }} type="submit" disabled={submitting}>
          {submitting ? 'Posting...' : 'Post game'}
        </button>
      </form>
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
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'white',
    borderBottom: '1px solid #E0DDD5',
    flexShrink: 0,
  },
  closeBtn: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2C2C2A',
  },
  headerSpacer: {
    width: '40px',
  },
  form: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#2C2C2A',
  },
  hint: {
    fontSize: '12px',
    color: '#7A7A72',
    marginTop: '-2px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '15px',
    background: 'white',
    border: '1px solid #E0DDD5',
    borderRadius: '10px',
    color: '#2C2C2A',
    outline: 'none',
  },
  inputSmall: {
    width: 'auto',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '15px',
    background: 'white',
    border: '1px solid #E0DDD5',
    borderRadius: '10px',
    color: '#2C2C2A',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
  },
  row: {
    display: 'flex',
    gap: '12px',
  },
  formatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  formatBtn: {
    padding: '10px 0',
    fontSize: '14px',
    fontWeight: '500',
    borderRadius: '10px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  locationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#1D9E75',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  map: {
    width: '100%',
    height: '200px',
    borderRadius: '10px',
    border: '1px solid #E0DDD5',
    overflow: 'hidden',
  },
  visibilityRow: {
    display: 'flex',
    gap: '10px',
  },
  visibilityBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '500',
    borderRadius: '10px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    color: '#2C2C2A',
  },
  submitBtn: {
    width: '100%',
    padding: '14px 0',
    background: '#1D9E75',
    color: 'white',
    fontSize: '15px',
    fontWeight: '600',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    marginTop: 'auto',
  },
}
