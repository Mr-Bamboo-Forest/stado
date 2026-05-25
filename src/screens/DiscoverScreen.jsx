import { useState } from "react";
import { games } from "../data/games";

const filters = ["Tonight", "This Week", "Any Time"];

export default function Discover({ onGameClick }) {
  const [activeFilter, setActiveFilter] = useState("Tonight");

  const filtered = games.filter((g) => {
    if (activeFilter === "Tonight") return g.date === "Tonight";
    if (activeFilter === "This Week") return true;
    return true;
  });

  return (
    <div style={styles.screen}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <span style={styles.wordmark}>stado</span>
        <div style={styles.avatar}>D</div>
      </div>

      {/* Filters */}
      <div style={styles.filterRow}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              ...styles.chip,
              ...(activeFilter === f ? styles.chipActive : {}),
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Game list */}
      <div style={styles.list}>
        {filtered.map((game) => (
          <GameCard key={game.id} game={game} onClick={() => onGameClick(game)} />
        ))}
      </div>
    </div>
  );
}

function GameCard({ game, onClick }) {
  const spotColor =
    game.spotsRemaining === 1
      ? { bg: "#FCEBEB", text: "#501313" }
      : game.spotsRemaining <= 4
      ? { bg: "#FAEEDA", text: "#633806" }
      : { bg: "#E1F5EE", text: "#085041" };

  return (
    <div style={styles.card} onClick={onClick}>
      <div style={styles.cardTop}>
        <span style={styles.gameName}>{game.name}</span>
        <span style={styles.formatBadge}>{game.format}</span>
      </div>

      <div style={styles.metaCol}>
        <div style={styles.metaRow}>
          <PinIcon />
          {game.location} · {game.distance}
        </div>
        <div style={styles.metaRow}>
          <ClockIcon />
          {game.date} · {game.time} · {game.host}
        </div>
      </div>

      <div style={styles.cardBottom}>
        <span style={{ ...styles.spotsBadge, background: spotColor.bg, color: spotColor.text }}>
          {game.spotsRemaining} {game.spotsRemaining === 1 ? "spot" : "spots"} left
        </span>
        <button style={styles.joinBtn} onClick={(e) => { e.stopPropagation(); }}>
          Join game
        </button>
      </div>
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B4B2A9" strokeWidth="2" style={{ flexShrink: 0 }}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B4B2A9" strokeWidth="2" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

const styles = {
  screen: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  topBar: {
    padding: "18px 20px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #E0DDD5",
    background: "#F1EFE8",
  },
  wordmark: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#2C2C2A",
    letterSpacing: "-0.5px",
    fontFamily: "system-ui, sans-serif",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#1D9E75",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: 700,
  },
  filterRow: {
    display: "flex",
    gap: "8px",
    padding: "12px 20px",
    background: "#F1EFE8",
  },
  chip: {
    padding: "6px 16px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    border: "1.5px solid #D3D1C7",
    background: "transparent",
    color: "#888780",
    fontFamily: "inherit",
  },
  chipActive: {
    background: "#1D9E75",
    borderColor: "#1D9E75",
    color: "white",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 16px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  card: {
    background: "white",
    borderRadius: "14px",
    padding: "16px",
    border: "1px solid #E0DDD5",
    cursor: "pointer",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "10px",
    gap: "8px",
  },
  gameName: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#2C2C2A",
    lineHeight: 1.3,
  },
  formatBadge: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#085041",
    background: "#E1F5EE",
    padding: "3px 10px",
    borderRadius: "20px",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  metaCol: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#888780",
  },
  cardBottom: {
    marginTop: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  spotsBadge: {
    fontSize: "12px",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: "20px",
  },
  joinBtn: {
    background: "#1D9E75",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "8px 18px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};