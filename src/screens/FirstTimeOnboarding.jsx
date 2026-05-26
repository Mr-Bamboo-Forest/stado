import { useState } from 'react'

const SLIDES = [
  {
    id: 1,
    title: 'Find your game',
    subtitle: 'Discover pickup football games happening near you right now',
    icon: 'search',
    color: '#E1F5EE',
  },
  {
    id: 2,
    title: 'Show up and play',
    subtitle: 'No coordination chaos. Just open, find, and go kick.',
    icon: 'play',
    color: '#E1F5EE',
  },
  {
    id: 3,
    title: 'Build your squad',
    subtitle: 'Meet other ballers and turn strangers into regular teammates',
    icon: 'people',
    color: '#E1F5EE',
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

  const handleSkip = () => {
    onComplete()
  }

  const slide = SLIDES[current]
  const isLast = current === SLIDES.length - 1

  return (
    <div style={styles.screen}>
      {/* Skip button */}
      <button style={styles.skipBtn} onClick={handleSkip}>
        Skip
      </button>

      {/* Content container */}
      <div style={styles.content}>
        {/* Icon/Visual */}
        <div style={{ ...styles.icon, background: slide.color }}>
          {slide.icon === 'search' && (
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          )}
          {slide.icon === 'play' && (
            <svg width="64" height="64" viewBox="0 0 24 24" fill="#1D9E75" stroke="none">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 20 12 10 16" fill="#F1EFE8" />
            </svg>
          )}
          {slide.icon === 'people' && (
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="9" cy="7" r="3" />
              <path d="M15 7a3 3 0 1 1 0 6 3 3 0 0 1 0-6" />
              <path d="M7 12h12v4a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-4" />
            </svg>
          )}
        </div>

        {/* Text content */}
        <div style={styles.textContent}>
          <h1 style={styles.title}>{slide.title}</h1>
          <p style={styles.subtitle}>{slide.subtitle}</p>
        </div>
      </div>

      {/* Dots and button container */}
      <div style={styles.footer}>
        {/* Dots */}
        <div style={styles.dots}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.dot,
                background: i === current ? '#1D9E75' : '#E0DDD5',
              }}
            />
          ))}
        </div>

        {/* Next/Get Started button */}
        <button style={styles.nextBtn} onClick={handleNext}>
          {isLast ? 'Get started' : 'Next'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  screen: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: '#F1EFE8',
    padding: '24px',
    position: 'relative',
  },
  skipBtn: {
    alignSelf: 'flex-end',
    background: 'none',
    border: 'none',
    color: '#7A7A72',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '8px 0',
    marginBottom: '24px',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '40px',
  },
  icon: {
    width: '120px',
    height: '120px',
    borderRadius: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'fadeInScale 0.6s ease-out',
  },
  textContent: {
    textAlign: 'center',
    maxWidth: '280px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#2C2C2A',
    margin: 0,
    marginBottom: '12px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '15px',
    color: '#7A7A72',
    lineHeight: '1.5',
    margin: 0,
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    alignItems: 'center',
  },
  dots: {
    display: 'flex',
    gap: '8px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: 'background 0.3s ease',
  },
  nextBtn: {
    width: '100%',
    maxWidth: '240px',
    padding: '14px 0',
    background: '#1D9E75',
    color: 'white',
    fontSize: '15px',
    fontWeight: '600',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
}

// Add animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.8);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `
  document.head.appendChild(style)
}
