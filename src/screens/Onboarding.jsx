import { useState } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

// ─── Drop your photos here ───────────────────────────────────────────────────
// Place your football photo files in: src/assets/onboarding/
// Name them: slide1.png, slide2.png, slide3.png
// Then update the imports below:
import slide1 from '../../public/slide1.png'
import slide2 from '../../public/slide2.png'
import slide3 from '../../public/slide3.png'
// ─────────────────────────────────────────────────────────────────────────────

const SLIDES = [
  {
    photo: slide1,
    title: 'Find your game',
    subtitle: 'Discover pickup football games happening near you right now',
  },
  {
    photo: slide2,
    title: 'Join in seconds',
    subtitle: 'One tap to join a game. No DMs, no group chats, no faff',
  },
  {
    photo: slide3,
    title: 'Build your reputation',
    subtitle: 'Show up, play well, and earn your spot in the community',
  },
]

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
  const [slide, setSlide] = useState(0)
  const [showProfile, setShowProfile] = useState(false)
  const [name, setName] = useState(user?.displayName || '')
  const [positions, setPositions] = useState([])
  const [loading, setSaving] = useState(false)
  const [error, setError] = useState('')

  const togglePosition = (id) => {
    setPositions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const handleNext = () => {
    if (slide < SLIDES.length - 1) {
      setSlide(slide + 1)
    } else {
      setShowProfile(true)
    }
  }

  const handleSubmit = async () => {
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

  if (showProfile) {
    return (
      <div style={s.screen}>
        <div style={s.profileContent}>
          <div style={s.profileHeader}>
            <div style={s.avatar}>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" style={s.avatarImg} />
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="1.5">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                </svg>
              )}
            </div>
            <h1 style={s.profileTitle}>Complete your profile</h1>
            <p style={s.profileSubtitle}>Tell us a bit about yourself</p>
          </div>

          <div style={s.field}>
            <label style={s.label}>Your name</label>
            <input
              style={s.input}
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Preferred positions</label>
            <p style={s.fieldHint}>Select all that apply</p>
            <div style={s.positionGrid}>
              {POSITIONS.map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  style={{
                    ...s.positionBtn,
                    background: positions.includes(pos.id) ? '#E1F5EE' : 'white',
                    borderColor: positions.includes(pos.id) ? '#1D9E75' : '#E0DDD5',
                  }}
                  onClick={() => togglePosition(pos.id)}
                  disabled={loading}
                >
                  <div style={{
                    ...s.checkbox,
                    background: positions.includes(pos.id) ? '#1D9E75' : 'white',
                    borderColor: positions.includes(pos.id) ? '#1D9E75' : '#C9C6BC',
                  }}>
                    {positions.includes(pos.id) && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    )}
                  </div>
                  <span style={s.positionLabel}>{pos.label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p style={s.error}>{error}</p>}

          <button
            style={{ ...s.nextBtn, opacity: loading || !name.trim() ? 0.6 : 1 }}
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
          >
            {loading ? 'Saving...' : 'Get started'}
          </button>
        </div>
      </div>
    )
  }

  const current = SLIDES[slide]

  return (
    <div style={s.screen}>
      {/* Full-bleed background photo */}
      <div
        style={{
          ...s.photoBg,
          backgroundImage: `url(${current.photo})`,
        }}
      />

      {/* Gradient overlay — dark at bottom, subtle at top */}
      <div style={s.overlay} />

      {/* Skip button */}
      <button style={s.skipBtn} onClick={() => setShowProfile(true)}>
        Skip
      </button>

      {/* Floating text bubble — vertically centred */}
      <div style={s.bubble}>
        <h1 style={s.bubbleTitle}>{current.title}</h1>
        <p style={s.bubbleText}>{current.subtitle}</p>
      </div>

      {/* Dot indicators */}
      <div style={s.dots}>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            style={{
              ...s.dot,
              background: i === slide ? 'white' : 'rgba(255,255,255,0.35)',
              width: i === slide ? '22px' : '8px',
            }}
          />
        ))}
      </div>

      {/* Next button */}
      <div style={s.bottomBar}>
        <button style={s.nextBtn} onClick={handleNext}>
          {slide === SLIDES.length - 1 ? 'Get started' : 'Next'}
        </button>
      </div>
    </div>
  )
}

const s = {
  screen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    background: '#0d1f12',
  },

  // ── Slideshow screen ──────────────────────────────────────────────────────

  photoBg: {
    position: 'absolute',
    inset: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transition: 'background-image 0.5s ease',
  },

  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.72) 100%)',
  },

  skipBtn: {
    position: 'absolute',
    top: '52px',
    right: '20px',
    zIndex: 10,
    background: 'rgba(255,255,255,0.18)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.28)',
    borderRadius: '20px',
    padding: '8px 20px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    letterSpacing: '0.01em',
  },

  bubble: {
    position: 'absolute',
    top: '50%',
    left: '24px',
    right: '24px',
    transform: 'translateY(-50%)',
    zIndex: 10,
    background: 'rgba(0,0,0,0.38)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '24px',
    padding: '28px 26px',
    textAlign: 'center',
  },

  bubbleTitle: {
    color: 'white',
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 10px',
    lineHeight: '1.15',
    letterSpacing: '-0.02em',
  },

  bubbleText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '15px',
    margin: 0,
    lineHeight: '1.55',
  },

  dots: {
    position: 'absolute',
    bottom: '104px',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '6px',
    zIndex: 10,
  },

  dot: {
    height: '8px',
    borderRadius: '4px',
    transition: 'width 0.3s ease, background 0.3s ease',
  },

  bottomBar: {
    position: 'absolute',
    bottom: '32px',
    left: '24px',
    right: '24px',
    zIndex: 10,
  },

  nextBtn: {
    width: '100%',
    padding: '16px',
    background: '#1D9E75',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '16px',
    border: 'none',
    cursor: 'pointer',
    letterSpacing: '0.01em',
  },

  // ── Profile screen ────────────────────────────────────────────────────────

  profileContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '60px 24px 40px',
    background: '#F1EFE8',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },

  profileHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },

  avatar: {
    width: '88px',
    height: '88px',
    borderRadius: '50%',
    background: 'white',
    border: '3px solid #E0DDD5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
    overflow: 'hidden',
  },

  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  profileTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#2C2C2A',
    margin: 0,
    textAlign: 'center',
  },

  profileSubtitle: {
    fontSize: '14px',
    color: '#7A7A72',
    margin: 0,
    textAlign: 'center',
  },

  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '14px', fontWeight: '600', color: '#2C2C2A' },
  fieldHint: { fontSize: '12px', color: '#7A7A72', margin: '0 0 4px' },

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

  positionGrid: { display: 'flex', flexDirection: 'column', gap: '10px' },

  positionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    border: '1px solid',
    borderRadius: '12px',
    cursor: 'pointer',
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

  positionLabel: { fontSize: '15px', fontWeight: '500', color: '#2C2C2A' },
  error: { fontSize: '13px', color: '#D63D3D', textAlign: 'center' },
}