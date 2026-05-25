import styles from './BottomNav.module.css'

function DiscoverIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0}/>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75"/>
      <path d="m16.5 16.5 3 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function PostIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor"/>
      <path d="M12 8v8M8 12h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function ProfileIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.75" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0}/>
      <path d="M4.5 20c0-4.142 3.358-7.5 7.5-7.5s7.5 3.358 7.5 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

export default function BottomNav({ active }) {
  return (
    <nav className={styles.nav}>
      <button className={`${styles.item} ${active === 'discover' ? styles.active : ''}`} type="button">
        <DiscoverIcon active={active === 'discover'} />
        <span>Discover</span>
      </button>

      <button className={styles.postBtn} type="button" aria-label="Post a Game">
        <PostIcon />
        <span className={styles.postLabel}>Post a Game</span>
      </button>

      <button className={`${styles.item} ${active === 'profile' ? styles.active : ''}`} type="button">
        <ProfileIcon active={active === 'profile'} />
        <span>Profile</span>
      </button>
    </nav>
  )
}
