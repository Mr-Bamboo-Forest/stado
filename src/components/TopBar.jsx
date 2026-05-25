import styles from './TopBar.module.css'

function ProfileIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#E0DDD5" />
      <circle cx="16" cy="13" r="5" fill="#7A7A72" />
      <path d="M6 26c0-5.523 4.477-10 10-10s10 4.477 10 10" fill="#7A7A72" />
    </svg>
  )
}

export default function TopBar() {
  return (
    <header className={styles.topBar}>
      <span className={styles.wordmark}>stado</span>
      <button className={styles.profileBtn} aria-label="Profile">
        <ProfileIcon />
      </button>
    </header>
  )
}
