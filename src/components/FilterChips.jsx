import styles from './FilterChips.module.css'

const FILTERS = ['Tonight', 'This Week', 'Any Time']

export default function FilterChips({ active, onChange }) {
  return (
    <div className={styles.wrapper}>
      {FILTERS.map((filter) => (
        <button
          key={filter}
          className={`${styles.chip} ${active === filter ? styles.active : ''}`}
          onClick={() => onChange(filter)}
          type="button"
        >
          {filter}
        </button>
      ))}
    </div>
  )
}
