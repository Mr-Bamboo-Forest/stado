import { useState, useEffect, useRef } from 'react'
import { collection, onSnapshot, query, orderBy, where, getDocs, doc, deleteDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { db } from '../firebase'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const BRISBANE_CENTER = [-27.4698, 153.0251]
const DISTANCE_FILTERS = ['2km', '5km', '10km', '25km', 'Any distance']

function createColoredIcon(color) {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  })
}

function MapController({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView(center, 14)
    }
  }, [center, map])
  return null
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatDistance(km) {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }
  return `${km.toFixed(1)}km`
}

function formatDate(dateStr, timeStr) {
  if (!dateStr) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const date = new Date(dateStr + 'T00:00:00')
  date.setHours(0, 0, 0, 0)

  const isToday = date.getTime() === today.getTime()
  const isTomorrow = date.getTime() === tomorrow.getTime()

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const timeFormatted = timeStr
    ? new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : ''

  if (isToday) {
    return `Tonight · ${timeFormatted}`
  } else if (isTomorrow) {
    return `Tomorrow · ${timeFormatted}`
  } else {
    const dayName = dayNames[date.getDay()]
    const day = date.getDate()
    const month = monthNames[date.getMonth()]
    return `${dayName} ${day} ${month} · ${timeFormatted}`
  }
}

export default function Discover({ onGameClick, userData, onJoinWithCode, onProfileClick, onHomeClick }) {
  const [viewMode, setViewMode] = useState('map')
  const [games, setGames] = useState([])
  const [userCoords, setUserCoords] = useState(null)
  const [usingFallback, setUsingFallback] = useState(false)
  const [distanceFilter, setDistanceFilter] = useState('10km')
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [joinCodeValid, setJoinCodeValid] = useState(null)
  const [gameFilter, setGameFilter] = useState('nearby')
  const [nearbyAlert, setNearbyAlert] = useState('')
  const [deletingGameId, setDeletingGameId] = useState(null)
  const userCoordsRef = useRef(userCoords)
  const prevGameIdsRef = useRef([])
  const initialLoadRef = useRef(true)
  const nearbyAlertTimerRef = useRef(null)
  const auth = getAuth()

  useEffect(() => {
    const q = query(collection(db, 'games'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gamesData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((game) => game.isPublic !== false)

      if (!initialLoadRef.current) {
        const previousIds = prevGameIdsRef.current
        const newGames = gamesData.filter((game) => !previousIds.includes(game.id))
        if (newGames.length && userCoordsRef.current) {
          const nearbyGame = newGames.find(
            (game) => getGameDistanceWithCoords(game, userCoordsRef.current) <= 5
          )
          if (nearbyGame) {
            setNearbyAlert(`New game posted near you: ${nearbyGame.name}`)
            if (nearbyAlertTimerRef.current) {
              clearTimeout(nearbyAlertTimerRef.current)
            }
            nearbyAlertTimerRef.current = window.setTimeout(() => {
              setNearbyAlert('')
            }, 6000)
          }
        }
      }

      prevGameIdsRef.current = gamesData.map((game) => game.id)
      initialLoadRef.current = false
      setGames(gamesData)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setUsingFallback(false)
        },
        () => {
          setUserCoords({ lat: BRISBANE_CENTER[0], lng: BRISBANE_CENTER[1] })
          setUsingFallback(true)
        }
      )
    } else {
      setUserCoords({ lat: BRISBANE_CENTER[0], lng: BRISBANE_CENTER[1] })
      setUsingFallback(true)
    }
  }, [])

  useEffect(() => {
    userCoordsRef.current = userCoords
  }, [userCoords])

  useEffect(() => {
    return () => {
      if (nearbyAlertTimerRef.current) {
        clearTimeout(nearbyAlertTimerRef.current)
      }
    }
  }, [])

  const getGameDistance = (game) => {
    if (!userCoords || !game.lat || !game.lng) return Infinity
    return haversineDistance(userCoords.lat, userCoords.lng, game.lat, game.lng)
  }

  const getGameDistanceWithCoords = (game, coords) => {
    if (!coords || !game.lat || !game.lng) return Infinity
    return haversineDistance(coords.lat, coords.lng, game.lat, game.lng)
  }

  const getDistanceLimit = () => {
    if (distanceFilter === 'Any distance') return Infinity
    return parseInt(distanceFilter)
  }

const currentUid = auth.currentUser?.uid
const getPinColor = (spotsRemaining) => {
  if (spotsRemaining === 1) return '#DC2626'
  if (spotsRemaining >= 2 && spotsRemaining <= 4) return '#F59E0B'
  return '#1D9E75'
}
const gamesWithDistance = games
  .map((game) => ({
    ...game,
    distance: getGameDistance(game),
  }))
  .filter((game) => {
    if (gameFilter === 'hosting') return game.hostUid === currentUid
    if (gameFilter === 'joined') {
      const playerUids = (game.players || []).map(p => typeof p === 'string' ? p : p?.uid)
      return playerUids.includes(currentUid) && game.hostUid !== currentUid
    }
    return game.distance <= getDistanceLimit()
  })
  .sort((a, b) => a.distance - b.distance)

  const handleJoinWithCode = async () => {
    if (joinCodeInput.length !== 6) {
      setJoinCodeValid(false)
      return
    }

    const gamesRef = collection(db, 'games')
    const q = query(gamesRef, where('joinCode', '==', joinCodeInput.toUpperCase()))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      setJoinCodeValid(false)
    } else {
      const game = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }
      setJoinCodeValid(true)
      onGameClick(game)
      setShowJoinModal(false)
      setJoinCodeInput('')
      setJoinCodeValid(null)
    }
  }

  const sendGameDeletedNotification = async (game) => {
    if (Notification.permission !== 'granted') return

    const players = game.players || []
    const currentUserUid = auth.currentUser?.uid

    for (const player of players) {
      const playerUid = typeof player === 'string' ? player : player?.uid
      if (playerUid && playerUid !== currentUserUid) {
        new Notification('Game Cancelled', {
          body: `"${game.name}" has been cancelled by the host.`,
          tag: `game-deleted-${game.id}`,
        })
      }
    }
  }

  const handleDeleteGame = async (game, e) => {
    e.stopPropagation()

    const currentUser = auth.currentUser
    if (!currentUser || game.hostUid !== currentUser.uid) {
      alert('Only the host can delete this game.')
      return
    }

    if (!window.confirm(`Are you sure you want to delete "${game.name}"? All players will be notified.`)) {
      return
    }

    setDeletingGameId(game.id)
    try {
      await sendGameDeletedNotification(game)
      await deleteDoc(doc(db, 'games', game.id))
    } catch (err) {
      console.error('Error deleting game:', err)
      alert('Failed to delete game. Please try again.')
    } finally {
      setDeletingGameId(null)
    }
  }

  const mapCenter = userCoords
    ? [userCoords.lat, userCoords.lng]
    : BRISBANE_CENTER

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.wordmarkBtn} onClick={onHomeClick} aria-label="Go to discover">
          <span style={styles.wordmark}>stado</span>
        </button>
        <button style={styles.profileBtn} aria-label="Profile" onClick={onProfileClick}>
          {userData?.photoURL ? (
            <img src={userData.photoURL} alt="Profile" style={styles.avatar} />
          ) : (
            <div style={styles.avatarPlaceholder}>
              {userData?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
        </button>
      </header>

      <div style={styles.content}>
        <div style={styles.viewToggle}>
          <button
            style={{
              ...styles.toggleBtn,
              ...(viewMode === 'map' ? styles.toggleBtnActive : {}),
            }}
            onClick={() => setViewMode('map')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Map
          </button>
          <button
            style={{
              ...styles.toggleBtn,
              ...(viewMode === 'list' ? styles.toggleBtnActive : {}),
            }}
            onClick={() => setViewMode('list')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
            List
          </button>
        </div>

        {usingFallback && (
          <div style={styles.locationBanner}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>Showing games near Brisbane — enable location for local results</span>
          </div>
        )}

        {nearbyAlert && (
          <div style={styles.nearbyAlert}>
            <p style={styles.nearbyAlertText}>{nearbyAlert}</p>
          </div>
        )}

        {viewMode === 'map' ? (
          <div style={styles.mapContainer}>
            <MapContainer
              center={mapCenter}
              zoom={14}
              style={styles.map}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController center={mapCenter} />
              {gamesWithDistance.map((game) => (
                <Marker
                  key={game.id}
                  position={[game.lat, game.lng]}
                  icon={createColoredIcon(getPinColor(game.spotsRemaining))}
                >
                  <Popup>
                    <div style={popupStyles.container} onClick={() => onGameClick(game)}>
                      <div style={popupStyles.header}>
                        <span style={popupStyles.name}>{game.name}</span>
                        <span style={{
                          ...popupStyles.badge,
                          background: game.spotsRemaining === 1 ? '#FCEBEB' : '#E1F5EE',
                          color: game.spotsRemaining === 1 ? '#DC2626' : '#0A6B4E',
                        }}>
                          {game.spotsRemaining === 1 ? '1 spot' : `${game.spotsRemaining} spots`}
                        </span>
                      </div>
                      <div style={popupStyles.details}>
                        <div style={popupStyles.row}>
                          <span style={popupStyles.format}>{game.format}</span>
                        </div>
                        <div style={popupStyles.row}>
                          <span style={popupStyles.time}>{formatDate(game.date, game.time)}</span>
                        </div>
                        <div style={popupStyles.row}>
                          <span style={popupStyles.distance}>{formatDistance(game.distance)} away</span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        ) : (
          <>
          <div style={styles.filters}>
            <div style={styles.distanceFilters}>
              {DISTANCE_FILTERS.map((d) => (
                <button
                  key={d}
                  style={{
                    ...styles.chip,
                    background: distanceFilter === d && gameFilter === 'nearby' ? '#085041' : 'white',
                    color: distanceFilter === d && gameFilter === 'nearby' ? 'white' : '#555550',
                    borderColor: distanceFilter === d && gameFilter === 'nearby' ? '#085041' : '#E0DDD5',
                  }}
                  onClick={() => { setDistanceFilter(d); setGameFilter('nearby') }}
                >
                  {d}
                </button>
              ))}
            </div>
            <div style={styles.gameFilterRow}>
              <button
                style={{...styles.gameFilterBtn, ...(gameFilter === 'nearby' ? styles.gameFilterBtnActive : {})}}
                onClick={() => setGameFilter('nearby')}
              >
                Open
              </button>
              <button
                style={{...styles.gameFilterBtn, ...(gameFilter === 'hosting' ? styles.gameFilterBtnActive : {})}}
                onClick={() => setGameFilter('hosting')}
              >
                Hosting
              </button>
              <button
                style={{...styles.gameFilterBtn, ...(gameFilter === 'joined' ? styles.gameFilterBtnActive : {})}}
                onClick={() => setGameFilter('joined')}
              >
                Joined
              </button>
              <button style={styles.codeBtn} onClick={() => setShowJoinModal(true)}>
                Join with code
              </button>
            </div>
          </div>

          <div style={styles.list}>
            {gamesWithDistance.length === 0 ? (
              <div style={styles.empty}>
                <p style={styles.emptyText}>
                  {gameFilter === 'hosting' ? 'No hosted games' : gameFilter === 'joined' ? 'No joined games' : 'No games nearby'}
                </p>
                <p style={styles.emptyHint}>
                  {gameFilter === 'hosting' ? 'Post a game to see it here' : gameFilter === 'joined' ? 'Join a game to see it here' : 'Try expanding your search radius'}
                </p>
              </div>
            ) : (
              gamesWithDistance.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  distance={formatDistance(game.distance)}
                  formattedDate={formatDate(game.date, game.time)}
                  onClick={() => onGameClick(game)}
                  isHost={game.hostUid === auth.currentUser?.uid}
                  onDelete={handleDeleteGame}
                  isDeleting={deletingGameId === game.id}
                />
              ))
            )}
          </div>
          </>
        )}
      </div>

      {showJoinModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Join with code</h3>
            <p style={styles.modalHint}>Enter the 6-character code from the host</p>
            <input
              style={{
                ...styles.modalInput,
                borderColor: joinCodeValid === false ? '#D63D3D' : '#E0DDD5',
              }}
              type="text"
              placeholder="ABC123"
              value={joinCodeInput}
              onChange={(e) => {
                setJoinCodeInput(e.target.value.toUpperCase().slice(0, 6))
                setJoinCodeValid(null)
              }}
              maxLength={6}
            />
            {joinCodeValid === false && (
              <p style={styles.modalError}>Invalid code. Try again.</p>
            )}
            <div style={styles.modalActions}>
              <button
                style={styles.modalCancelBtn}
                onClick={() => {
                  setShowJoinModal(false)
                  setJoinCodeInput('')
                  setJoinCodeValid(null)
                }}
              >
                Cancel
              </button>
              <button style={styles.modalJoinBtn} onClick={handleJoinWithCode}>
                Join
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 0;
        }
        .leaflet-popup-content {
          margin: 0;
          min-width: 180px;
        }
      `}</style>
    </div>
  )
}

function GameCard({ game, distance, formattedDate, onClick, isHost, onDelete, isDeleting }) {
  const spots = game.spotsRemaining || 0
  let spotsStyle = styles.spotsGreen
  if (spots >= 2 && spots <= 4) spotsStyle = styles.spotsAmber
  if (spots === 1) spotsStyle = styles.spotsRed

  return (
    <article style={styles.card} onClick={onClick}>
      <div style={styles.cardHeader}>
        <div>
          <h3 style={styles.cardName}>{game.name}</h3>
          <span style={styles.format}>{game.format}</span>
        </div>
        <span style={{ ...styles.spotsBadge, ...spotsStyle }}>
          {spots === 1 ? '1 spot left' : `${spots} spots left`}
        </span>
      </div>

      <div style={styles.meta}>
        <div style={styles.metaRow}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#7A7A72" strokeWidth="1.25">
            <path d="M6.5 1a3.75 3.75 0 0 1 3.75 3.75c0 2.625-3.75 7.25-3.75 7.25S2.75 7.375 2.75 4.75A3.75 3.75 0 0 1 6.5 1Z" />
            <circle cx="6.5" cy="4.75" r="1.25" fill="#7A7A72" />
          </svg>
          <span style={styles.metaText}>{distance} away</span>
        </div>
        <div style={styles.metaRow}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#7A7A72" strokeWidth="1.25">
            <circle cx="6.5" cy="6.5" r="5" />
            <path d="M6.5 4v2.5l1.5 1.5" strokeLinecap="round" />
          </svg>
          <span style={styles.metaText}>{formattedDate}</span>
        </div>
        <div style={styles.metaRow}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#7A7A72" strokeWidth="1.25">
            <circle cx="6.5" cy="4.5" r="2" />
            <path d="M2 11c0-2.485 2.015-4.5 4.5-4.5S11 8.515 11 11" strokeLinecap="round" />
          </svg>
          <span style={styles.metaText}>Hosted by <strong>{game.host}</strong></span>
        </div>
      </div>

      <div style={styles.cardFooter}>
        <button style={styles.viewBtn}>View game</button>
        {isHost && (
          <button
            style={{ ...styles.deleteBtn, opacity: isDeleting ? 0.7 : 1 }}
            onClick={(e) => onDelete(game, e)}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </article>
  )
}

const popupStyles = {
  container: {
    cursor: 'pointer',
    padding: '8px 0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
    gap: '8px',
  },
  name: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2C2C2A',
    lineHeight: '1.2',
  },
  badge: {
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '100px',
    whiteSpace: 'nowrap',
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
  },
  format: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#7A7A72',
    background: '#F1EFE8',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  time: {
    fontSize: '12px',
    color: '#555550',
  },
  distance: {
    fontSize: '11px',
    color: '#1D9E75',
    fontWeight: '500',
  },
}

const styles = {
  screen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px 12px',
    flexShrink: 0,
  },
  wordmarkBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  },
  wordmark: {
    fontSize: '24px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    color: '#085041',
  },
  profileBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#E0DDD5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    color: '#7A7A72',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  viewToggle: {
    display: 'flex',
    gap: '8px',
    padding: '0 16px 12px',
    flexShrink: 0,
  },
  locationBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    margin: '0 16px 8px',
    background: '#FAEEDA',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#9B5E00',
    flexShrink: 0,
  },
  toggleBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 0',
    background: 'white',
    color: '#7A7A72',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '10px',
    border: '1px solid #E0DDD5',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  toggleBtnActive: {
    background: '#085041',
    color: 'white',
    borderColor: '#085041',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    minHeight: '400px',
  },
  map: {
    height: '100%',
    width: '100%',
    minHeight: '400px',
  },
  filters: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '12px 16px',
    flexShrink: 0,
  },
  distanceFilters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  chip: {
    padding: '8px 14px',
    borderRadius: '100px',
    fontSize: '13px',
    fontWeight: '500',
    border: '1.5px solid',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  codeBtn: {
    padding: '10px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    background: '#E1F5EE',
    color: '#085041',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '0 16px 16px',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid #E0DDD5',
    cursor: 'pointer',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  cardName: {
    fontSize: '16px',
    fontWeight: '600',
    letterSpacing: '-0.2px',
    marginBottom: '4px',
  },
  format: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#7A7A72',
    background: '#F1EFE8',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  spotsBadge: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '100px',
  },
  spotsGreen: {
    background: '#E1F5EE',
    color: '#0A6B4E',
  },
  spotsAmber: {
    background: '#FAEEDA',
    color: '#9B5E00',
  },
  spotsRed: {
    background: '#FCEBEB',
    color: '#A02020',
  },
  meta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
    marginBottom: '12px',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13.5px',
    color: '#555550',
  },
  metaText: {
    flex: 1,
  },
  distance: {
    fontSize: '12px',
    color: '#1D9E75',
    fontWeight: '600',
    background: '#E1F5EE',
    padding: '2px 7px',
    borderRadius: '5px',
  },
  cardFooter: {
    display: 'flex',
    gap: '10px',
  },
  viewBtn: {
    flex: 1,
    padding: '11px 0',
    background: '#1D9E75',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
  },
  deleteBtn: {
    flex: 1,
    padding: '11px 0',
    background: '#D63D3D',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    padding: '48px 20px',
  },
  emptyText: {
    fontSize: '17px',
    fontWeight: '600',
    color: '#2C2C2A',
    marginBottom: '8px',
  },
  emptyHint: {
    fontSize: '14px',
    color: '#7A7A72',
  },
  nearbyAlert: {
    margin: '0 16px 12px',
    padding: '14px 16px',
    background: '#E1F5FF',
    border: '1px solid #A8D1FF',
    borderRadius: '14px',
  },
  nearbyAlertText: {
    margin: 0,
    color: '#084B8A',
    fontSize: '14px',
    lineHeight: '1.5',
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '320px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2C2C2A',
    marginBottom: '8px',
    textAlign: 'center',
  },
  modalHint: {
    fontSize: '14px',
    color: '#7A7A72',
    textAlign: 'center',
    marginBottom: '16px',
  },
  modalInput: {
    width: '100%',
    padding: '14px',
    fontSize: '18px',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: '8px',
    background: 'white',
    border: '2px solid',
    borderRadius: '12px',
    outline: 'none',
    color: '#2C2C2A',
    textTransform: 'uppercase',
  },
  modalError: {
    fontSize: '13px',
    color: '#D63D3D',
    textAlign: 'center',
    marginTop: '8px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  modalCancelBtn: {
    flex: 1,
    padding: '12px',
    background: 'white',
    color: '#555550',
    fontSize: '15px',
    fontWeight: '600',
    borderRadius: '10px',
    border: '1px solid #E0DDD5',
    cursor: 'pointer',
  },
  modalJoinBtn: {
    flex: 1,
    padding: '12px',
    background: '#1D9E75',
    color: 'white',
    fontSize: '15px',
    fontWeight: '600',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
  },
    gameFilterRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  gameFilterBtn: {
    padding: '8px 14px',
    borderRadius: '100px',
    fontSize: '13px',
    fontWeight: '600',
    border: '1.5px solid #E0DDD5',
    background: 'white',
    color: '#555550',
    cursor: 'pointer',
  },
  gameFilterBtnActive: {
    background: '#1D9E75',
    color: 'white',
    borderColor: '#1D9E75',
  },
}
