import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { archiveGame } from "../utils/social";
import AttendanceModal from "../components/AttendanceModal";
import NoShowWarningModal from "../components/NoShowWarningModal";
import { NoShowDot } from "../components/NoShowBadge";

export default function GameDetail({ game, onBack, onViewProfile }) {
  const auth = getAuth();
  const me = auth.currentUser;
  const isHost = me?.uid === game.hostUid;

  const [joined, setJoined] = useState(
    game.playerUids?.includes(me?.uid) || false
  );
  const [gameData, setGameData] = useState(game);
  const [playerProfiles, setPlayerProfiles] = useState({});
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showNoShowWarning, setShowNoShowWarning] = useState(false);
  const [myNoShowRate, setMyNoShowRate] = useState(0);
  const [joiningPending, setJoiningPending] = useState(false);

  useEffect(() => {
    loadPlayerProfiles();
    if (me) loadMyNoShowRate();
  }, [gameData]);

  const loadPlayerProfiles = async () => {
    const uids = gameData.playerUids || [];
    if (uids.length === 0) return;
    const profiles = {};
    await Promise.all(
      uids.map(async (uid) => {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) profiles[uid] = snap.data();
      })
    );
    setPlayerProfiles(profiles);
  };

  const loadMyNoShowRate = async () => {
    const snap = await getDoc(doc(db, "users", me.uid));
    setMyNoShowRate(snap.data()?.noShowRate || 0);
  };

  const handleJoinPress = () => {
    if (myNoShowRate >= 10) {
      setShowNoShowWarning(true);
    } else {
      doJoin();
    }
  };

  const doJoin = async () => {
    if (!me || joiningPending) return;
    setJoiningPending(true);
    try {
      const gameRef = doc(db, "games", gameData.id);
      await updateDoc(gameRef, {
        playerUids: arrayUnion(me.uid),
        players: arrayUnion(me.displayName || "Player"),
        spotsRemaining: Math.max(0, (gameData.spotsRemaining || 1) - 1),
      });
      setJoined(true);
      setGameData((prev) => ({
        ...prev,
        playerUids: [...(prev.playerUids || []), me.uid],
        players: [...(prev.players || []), me.displayName || "Player"],
        spotsRemaining: Math.max(0, (prev.spotsRemaining || 1) - 1),
      }));
      // Update user's gamesAttended count
      await updateDoc(doc(db, "users", me.uid), {
        gamesAttended: ((await getDoc(doc(db, "users", me.uid))).data()?.gamesAttended || 0) + 1,
      });
    } catch (err) {
      console.error("Error joining game:", err);
    }
    setJoiningPending(false);
  };

  const handleAttendanceConfirm = async (attendance) => {
    try {
      // Filter out null entries
      const cleanAttendance = {};
      Object.entries(attendance).forEach(([uid, val]) => {
        if (val !== null) cleanAttendance[uid] = val;
      });

      // Mark game as completed in Firestore first
      await updateDoc(doc(db, "games", gameData.id), {
        completed: true,
        completedAt: serverTimestamp(),
        attendance: cleanAttendance,
      });

      // Archive the game (this also deletes from active and recalcs stats)
      await archiveGame(
        { ...gameData, attendance: cleanAttendance },
        cleanAttendance
      );

      setShowAttendanceModal(false);
      onBack();
    } catch (err) {
      console.error("Error completing game:", err);
    }
  };

  const spots = gameData.spotsRemaining || 0;
  let spotsStyle = styles.spotsGreen;
  if (spots >= 2 && spots <= 4) spotsStyle = styles.spotsAmber;
  if (spots === 1) spotsStyle = styles.spotsRed;

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onBack} aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2C2C2A" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span style={styles.headerTitle}>Game Details</span>
        <div style={styles.headerSpacer} />
      </header>

      <div style={styles.content}>
        <div style={styles.hero}>
          <div style={styles.heroTop}>
            <h1 style={styles.gameName}>{gameData.name}</h1>
            <span style={styles.format}>{gameData.format}</span>
          </div>
          <span style={{ ...styles.spotsBadge, ...spotsStyle }}>
            {spots === 1 ? "1 spot left" : `${spots} spots left`}
          </span>
        </div>

        <div style={styles.section}>
          <div style={styles.infoRow}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div>
              <p style={styles.infoLabel}>Location</p>
              <p style={styles.infoValue}>{gameData.location}</p>
              {joined && <p style={styles.address}>{gameData.address}</p>}
            </div>
          </div>
          <div style={styles.infoRow}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <div>
              <p style={styles.infoLabel}>Time</p>
              <p style={styles.infoValue}>{gameData.date} {gameData.time}</p>
            </div>
          </div>
          <div style={styles.infoRow}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <div>
              <p style={styles.infoLabel}>Host</p>
              <button
                style={styles.hostLink}
                onClick={() => onViewProfile && onViewProfile(gameData.hostUid)}
              >
                {gameData.host}
              </button>
            </div>
          </div>
          <div style={styles.infoRow}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="2">
              <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
            </svg>
            <div>
              <p style={styles.infoLabel}>Level</p>
              <p style={styles.infoValue}>{gameData.skill}</p>
            </div>
          </div>
        </div>

        {gameData.note && (
          <div style={styles.section}>
            <p style={styles.sectionTitle}>About</p>
            <p style={styles.note}>{gameData.note}</p>
          </div>
        )}

        <div style={styles.section}>
          <p style={styles.sectionTitle}>
            Players ({(gameData.playerUids || gameData.players || []).length}/{gameData.spotsTotal})
          </p>
          <div style={styles.playerList}>
            {(gameData.playerUids || []).map((uid) => {
              const profile = playerProfiles[uid] || {};
              const name = profile.name || "Player";
              const rate = profile.noShowRate || 0;
              const isGameHost = uid === gameData.hostUid;

              return (
                <button
                  key={uid}
                  style={styles.playerChip}
                  onClick={() => onViewProfile && onViewProfile(uid)}
                >
                  <div style={styles.playerAvatar}>{name[0]?.toUpperCase()}</div>
                  <span style={styles.playerName}>
                    {name}
                    {rate >= 10 && <NoShowDot rate={rate} size={6} />}
                  </span>
                  {isGameHost && <span style={styles.hostBadge}>Host</span>}
                </button>
              );
            })}
            {/* Fallback for legacy games without playerUids */}
            {!gameData.playerUids?.length &&
              (gameData.players || []).map((player, i) => (
                <div key={i} style={styles.playerChip}>
                  <div style={styles.playerAvatar}>{player[0]}</div>
                  <span style={styles.playerName}>{player}</span>
                  {player === gameData.host && (
                    <span style={styles.hostBadge}>Host</span>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Host: mark attendance button */}
        {isHost && !gameData.completed && (
          <button
            style={styles.attendanceBtn}
            onClick={() => setShowAttendanceModal(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Mark attendance and complete game
          </button>
        )}

        {gameData.completed && (
          <div style={styles.completedBadge}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#085041" strokeWidth="2.5" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Game completed
          </div>
        )}

        {/* Join button for non-hosts, non-members */}
        {!joined && !isHost && (
          <button
            style={{ ...styles.joinBtn, opacity: joiningPending ? 0.7 : 1 }}
            onClick={handleJoinPress}
            disabled={joiningPending}
          >
            {joiningPending ? "Joining..." : "Join game to see address"}
          </button>
        )}

        {joined && !isHost && (
          <div style={styles.joinedState}>
            <p style={styles.joinedText}>You&apos;re in! See you there.</p>
            <button style={styles.addressBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Open in Maps
            </button>
          </div>
        )}
      </div>

      {showNoShowWarning && (
        <NoShowWarningModal
          rate={myNoShowRate}
          onConfirm={() => {
            setShowNoShowWarning(false);
            doJoin();
          }}
          onCancel={() => setShowNoShowWarning(false)}
        />
      )}

      {showAttendanceModal && (
        <AttendanceModal
          game={gameData}
          playerProfiles={playerProfiles}
          onConfirm={handleAttendanceConfirm}
          onCancel={() => setShowAttendanceModal(false)}
        />
      )}
    </div>
  );
}

const styles = {
  screen: { flex: 1, display: "flex", flexDirection: "column", background: "#F1EFE8" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 16px", background: "white", borderBottom: "1px solid #E0DDD5", flexShrink: 0,
  },
  backBtn: {
    width: "40px", height: "40px", display: "flex", alignItems: "center",
    justifyContent: "center", borderRadius: "12px", background: "none", border: "none", cursor: "pointer",
  },
  headerTitle: { fontSize: "16px", fontWeight: "600", color: "#2C2C2A" },
  headerSpacer: { width: "40px" },
  content: {
    flex: 1, overflowY: "auto", padding: "20px 16px",
    display: "flex", flexDirection: "column", gap: "20px",
  },
  hero: {
    background: "white", borderRadius: "16px", padding: "20px",
    border: "1px solid #E0DDD5",
  },
  heroTop: { marginBottom: "12px" },
  gameName: { fontSize: "22px", fontWeight: "700", letterSpacing: "-0.5px", marginBottom: "8px" },
  format: {
    fontSize: "12px", fontWeight: "500", color: "#7A7A72",
    background: "#F1EFE8", padding: "3px 8px", borderRadius: "6px",
  },
  spotsBadge: { display: "inline-block", fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "100px" },
  spotsGreen: { background: "#E1F5EE", color: "#0A6B4E" },
  spotsAmber: { background: "#FAEEDA", color: "#9B5E00" },
  spotsRed: { background: "#FCEBEB", color: "#A02020" },
  section: {
    background: "white", borderRadius: "16px", padding: "20px",
    border: "1px solid #E0DDD5", display: "flex", flexDirection: "column", gap: "16px",
  },
  infoRow: { display: "flex", gap: "12px", alignItems: "flex-start" },
  infoLabel: { fontSize: "12px", fontWeight: "500", color: "#7A7A72", marginBottom: "2px" },
  infoValue: { fontSize: "15px", fontWeight: "500", color: "#2C2C2A" },
  hostLink: {
    fontSize: "15px", fontWeight: "500", color: "#1D9E75",
    background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline",
  },
  address: { fontSize: "13px", color: "#555550", marginTop: "4px" },
  sectionTitle: { fontSize: "14px", fontWeight: "600", color: "#2C2C2A", marginTop: "-4px" },
  note: { fontSize: "14px", color: "#555550", lineHeight: "1.5" },
  playerList: { display: "flex", flexWrap: "wrap", gap: "8px" },
  playerChip: {
    display: "flex", alignItems: "center", gap: "8px",
    background: "#F1EFE8", padding: "6px 10px 6px 6px", borderRadius: "100px",
    border: "none", cursor: "pointer",
  },
  playerAvatar: {
    width: "28px", height: "28px", borderRadius: "50%", background: "#1D9E75",
    color: "white", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "12px", fontWeight: "600",
  },
  playerName: {
    fontSize: "13px", fontWeight: "500", color: "#2C2C2A",
    display: "flex", alignItems: "center", gap: "4px",
  },
  hostBadge: {
    fontSize: "10px", fontWeight: "600", color: "#085041",
    background: "#E1F5EE", padding: "2px 6px", borderRadius: "4px", marginLeft: "-2px",
  },
  attendanceBtn: {
    width: "100%", padding: "14px 0", background: "#085041", color: "white",
    fontSize: "14px", fontWeight: "600", borderRadius: "12px", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
  },
  completedBadge: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
    padding: "14px", background: "#E1F5EE", borderRadius: "12px",
    fontSize: "14px", fontWeight: "600", color: "#085041",
  },
  joinBtn: {
    width: "100%", padding: "14px 0", background: "#1D9E75", color: "white",
    fontSize: "15px", fontWeight: "600", borderRadius: "12px", border: "none", cursor: "pointer",
  },
  joinedState: {
    background: "#E1F5EE", borderRadius: "12px", padding: "16px", textAlign: "center",
  },
  joinedText: { fontSize: "14px", fontWeight: "600", color: "#085041", marginBottom: "12px" },
  addressBtn: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    padding: "10px 16px", background: "#085041", color: "white",
    fontSize: "13px", fontWeight: "600", borderRadius: "8px", border: "none", cursor: "pointer",
  },
};