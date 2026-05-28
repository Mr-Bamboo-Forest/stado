import { useState } from 'react'

const SLIDES = [
  {
    photo: '../../public/slide1.png',
    title: 'Find your game',
    subtitle: 'Discover pickup football games happening near you right now',
  },
  {
    photo: '../../public/slide2.png',
    title: 'Show up and play',
    subtitle: 'No coordination chaos. Just open, find, and go kick.',
  },
  {
    photo: '../../public/slide3.png',
    title: 'Build your squad',
    subtitle: 'Meet other ballers and turn strangers into regular teammates',
  },
]

export default function FirstTimeOnboarding({ onComplete }) {
  const [current, setCurrent] = useState(0)

  const handleNext = () => {
    if (current < SLIDES.length - 1) {
      setCurrent(current + 1)
    } else {
      onComplete()
    }
  }

  const slide = SLIDES[current]
  const isLast = current === SLIDES.length - 1

  return (
    <div style={s.screen}>
      {/* Full-bleed background photo */}
      <div style={{ ...s.photoBg, backgroundImage: `url(${slide.photo})` }} />

      {/* Gradient overlay — dark at bottom, subtle at top */}
      <div style={s.overlay} />

      {/* Skip button */}
      <button style={s.skipBtn} onClick={onComplete}>
        Skip
      </button>

      {/* Floating text bubble — vertically centred */}
      <div style={s.bubble}>
        <h1 style={s.bubbleTitle}>{slide.title}</h1>
        <p style={s.bubbleText}>{slide.subtitle}</p>
      </div>

      {/* Dot indicators */}
      <div style={s.dots}>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            style={{
              ...s.dot,
              background: i === current ? 'white' : 'rgba(255,255,255,0.35)',
              width: i === current ? '22px' : '8px',
            }}
          />
        ))}
      </div>

      {/* Next / Get started button */}
      <div style={s.bottomBar}>
        <button style={s.nextBtn} onClick={handleNext}>
          {isLast ? 'Get started' : 'Next'}
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
}