import styles from './GameCard.module.css'

function spotsConfig(spots) {
  if (spots >= 5) return { label: `${spots} spots left`, variant: 'green' }
  if (spots >= 2) return { label: `${spots} spots left`, variant: 'amber' }
  return { label: '1 spot left', variant: 'red' }
}

function LocationIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6.5 1a3.75 3.75 0 0 1 3.75 3.75c0 2.625-3.75 7.25-3.75 7.25S2.75 7.375 2.75 4.75A3.75 3.75 0 0 1 6.5 1Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
      <circle cx="6.5" cy="4.75" r="1.25" fill="currentColor"/>
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M6.5 4v2.5l1.5 1.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="6.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M2 11c0-2.485 2.015-4.5 4.5-4.5S11 8.515 11 11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  )
}

export default function GameCard({ game }) {
  const spots = spotsConfig(game.spotsRemaining)

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.name}>{game.name}</h3>
          <span className={styles.format}>{game.format}</span>
        </div>
        <span className={`${styles.spotsBadge} ${styles[spots.variant]}`}>
          {spots.label}
        </span>
      </div>

      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <LocationIcon />
          <span>{game.location}</span>
          <span className={styles.distance}>{game.distance}</span>
        </div>
        <div className={styles.metaItem}>
          <ClockIcon />
          <span>{game.date} &middot; {game.time}</span>
        </div>
        <div className={styles.metaItem}>
          <PersonIcon />
          <span>Hosted by <strong>{game.host}</strong></span>
        </div>
      </div>

      <button className={styles.joinBtn} type="button">
        Join game
      </button>
    </article>
  )
}
