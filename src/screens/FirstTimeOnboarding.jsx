import { useState, useEffect } from 'react'

import slide1 from '../../public/slide1.png'
import slide2 from '../../public/slide2.png'
import slide3 from '../../public/slide3.png'

// ─── Slide definitions ────────────────────────────────────────────────────────
// Slide 1: What the app IS (consolidates the old 3 marketing slides)
// Slide 2: How to use Discover
// Slide 3: How to use Post
// Slide 4: How to use Profile
// ─────────────────────────────────────────────────────────────────────────────

const SLIDES = [
  {
    photo: slide1,
    tag: 'Welcome to Stado',
    title: 'Pickup football,\nfound in seconds',
    subtitle:
      'Find games near you, join with one tap, and build your reputation in the local football community. No group chats. No faff.',
    cta: 'Show me how',
  },
  {
    photo: slide2,
    tag: 'Discover tab',
    title: 'Find a game\nnear you',
    subtitle:
      'Browse games on the map or switch to the list view. Filter by distance, tap a pin to see the details such as the spots, skill level and who is the host. Join in one tap.',
    cta: 'Next',
  },
  {
    photo: slide3,
    tag: 'Post tab',
    title: 'Host your\nown game',
    subtitle:
      'Tap the + button to post a game. Set the location on the map, choose your format and skill level, and share the join code with mates for private games.',
    cta: 'Next',
  },
  {
    photo: slide1,
    tag: 'Profile tab',
    title: 'Your football\nreputation',
    subtitle:
      'Track games attended and hosted, manage friends with your personal player code, and upgrade to Ultra for unlimited posts and recurring fixtures.',
    cta: "Let's go",
  },
]

export default function FirstTimeOnboarding({ onComplete }) {
  const [current, setCurrent] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState('in') // 'in' | 'out'

  const slide = SLIDES[current]
  const isLast = current === SLIDES.length - 1

  const handleNext = () => {
    if (animating) return
    if (isLast) {
      onComplete()
      return
    }
    setAnimating(true)
    setDirection('out')
    setTimeout(() => {
      setCurrent((c) => c + 1)
      setDirection('in')
      setTimeout(() => setAnimating(false), 350)
    }, 250)
  }

  // Preload all images so transitions are instant
  useEffect(() => {
    SLIDES.forEach((s) => {
      const img = new Image()
      img.src = s.photo
    })
  }, [])

  const bubbleStyle = {
    ...s.bubble,
    opacity: animating && direction === 'out' ? 0 : 1,
    transform:
      animating && direction === 'out'
        ? 'translateY(-48%) scale(0.97)'
        : animating && direction === 'in'
        ? 'translateY(-52%) scale(0.97)'
        : 'translateY(-50%) scale(1)',
    transition: animating
      ? 'opacity 0.25s ease, transform 0.25s ease'
      : 'opacity 0.35s ease, transform 0.35s ease',
  }

  return (
    <div style={s.screen}>
      {/* Full-bleed background photo */}
      <div
        style={{
          ...s.photoBg,
          backgroundImage: `url(${slide.photo})`,
        }}
      />

      {/* Gradient overlay */}
      <div style={s.overlay} />

      {/* Skip button */}
      <button style={s.skipBtn} onClick={onComplete}>
        Skip
      </button>

      {/* Content bubble */}
      <div style={bubbleStyle}>
        {/* Tag / eyebrow */}
        <div style={s.tag}>{slide.tag}</div>

        {/* Title — preserve newlines */}
        <h1 style={s.bubbleTitle}>
          {slide.title.split('\n').map((line, i) => (
            <span key={i}>
              {line}
              {i < slide.title.split('\n').length - 1 && <br />}
            </span>
          ))}
        </h1>

        <p style={s.bubbleText}>{slide.subtitle}</p>
      </div>

      {/* Progress dots */}
      <div style={s.dots}>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            style={{
              ...s.dot,
              background: i === current ? 'white' : 'rgba(255,255,255,0.32)',
              width: i === current ? '24px' : '8px',
            }}
          />
        ))}
      </div>

      {/* CTA button */}
      <div style={s.bottomBar}>
        <button style={s.nextBtn} onClick={handleNext}>
          {slide.cta}
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

  photoBg: {
    position: 'absolute',
    inset: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transition: 'background-image 0.4s ease',
  },

  overlay: {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.08) 38%, rgba(0,0,0,0.75) 100%)',
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
    left: '20px',
    right: '20px',
    // transform handled inline for animation
    zIndex: 10,
    background: 'rgba(0,0,0,0.42)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: '24px',
    padding: '28px 24px 26px',
    textAlign: 'center',
  },

  tag: {
    display: 'inline-block',
    background: 'rgba(29,158,117,0.28)',
    border: '1px solid rgba(29,158,117,0.55)',
    borderRadius: '100px',
    padding: '5px 14px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#5FDBB5',
    letterSpacing: '0.03em',
    marginBottom: '14px',
    textTransform: 'uppercase',
  },

  bubbleTitle: {
    color: 'white',
    fontSize: '26px',
    fontWeight: '700',
    margin: '0 0 12px',
    lineHeight: '1.18',
    letterSpacing: '-0.025em',
  },

  bubbleText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: '14.5px',
    margin: 0,
    lineHeight: '1.6',
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
    left: '20px',
    right: '20px',
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
}