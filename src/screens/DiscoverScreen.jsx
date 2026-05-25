import { useState } from 'react'
import TopBar from '../components/TopBar'
import FilterChips from '../components/FilterChips'
import GameCard from '../components/GameCard'
import BottomNav from '../components/BottomNav'
import { games } from '../data/games'
import styles from './DiscoverScreen.module.css'

function filterGames(games, filter) {
  if (filter === 'Tonight') return games.filter(g => g.date === 'Tonight')
  if (filter === 'This Week') return games.filter(g => ['Tonight', 'Wed 28 May', 'Thu 29 May'].includes(g.date))
  return games
}

export default function DiscoverScreen() {
  const [activeFilter, setActiveFilter] = useState('Any Time')
  const filtered = filterGames(games, activeFilter)

  return (
    <div className={styles.screen}>
      <TopBar />

      <div className={styles.content}>
        <div className={styles.heading}>
          <h1 className={styles.title}>Find a game</h1>
          <p className={styles.subtitle}>Brisbane &amp; surrounds</p>
        </div>

        <FilterChips active={activeFilter} onChange={setActiveFilter} />

        <div className={styles.list}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                  <circle cx="19" cy="19" r="11" stroke="#C5C2BB" strokeWidth="2"/>
                  <path d="m27.5 27.5 5 5" stroke="#C5C2BB" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </span>
              <p className={styles.emptyText}>No games found</p>
              <p className={styles.emptySub}>Try a different time filter</p>
            </div>
          ) : (
            filtered.map(game => (
              <GameCard key={game.id} game={game} />
            ))
          )}
        </div>
      </div>

      <BottomNav active="discover" />
    </div>
  )
}
