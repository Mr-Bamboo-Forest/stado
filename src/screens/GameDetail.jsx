import { useState } from "react";

export default function GameDetail({ game, onBack }) {
  const [joined, setJoined] = useState(false);

  if (!game) return null;

  const spotColor =
    game.spotsRemaining === 1
      ? { bg: "#FCEBEB", text: "#501313" }
      : game.spotsRemaining <= 4
      ? { bg: "#FAEEDA", text: "#633806" }
      : { bg: "#E1F5EE", text: "#085041" };

  return (
    <div style={styles.screen}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2C2C2A" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <span style={styles.headerTitle}>Game details</span>
        <div style={{ width: 36 }} />
      </div>

      <div style={styles.body}>
        {/* Title block */}
        <div style={styles.titleBlock}>
          <div style={styles.titleRow}>
            <h1 style={styles.gameName}>{game.name}</h1>
            <span style={styles.formatBadge}>{game.format}</span>
          </div>
          <span style={{ ...styles.spotsBadge, background: spotColor.bg, color: spotColor.text }}>
            {game.spotsRemaining} {game.spotsRemaining === 1 ? "spot" : "spots"} left
          </span>
        </div>

        {/* Info rows */}
        <div style={styles.infoCard}>
          <InfoRow icon={<ClockIcon />} label="When" value={`${game.date} · ${game.time}`} />
          <Divider />
          <InfoRow
            icon={<PinIcon />}
            label="Where"
            value={joined ? game.location + ", Brisbane" : "Join to reveal full address"}
            muted={!joined}
          />
          <Divider />
          <InfoRow icon={<PersonIcon />} label="Host" value={game.host} />
          <Divider />
          <InfoRow icon={<StarIcon />} label="Skill level" value={game.skill} />
        </div>

        {/* Host note */}
        {game.note && (
          <div style={styles.noteCard}>
            <p style={styles.noteLabel}>Host note</p>
            <p style={styles.noteText}>{game.note}</p>
          </div>
        )}

        {/* Players */}
        <div style={styles.section}>
          <p style={styles.sectionLabel}>
            Players ({game.players.length}/{game.spotsTotal})
          </p>
          <div style={styles.playerList}>
            {game.players.map((p, i) => (
              <div key={i} style={styles.playerChip}>
                <div style={styles.playerAvatar}>{p[0]}</div>
                <span style={styles.playerName}>{p}</span>
              </div>
            ))}
            {Array.from({ length: game.spotsRemaining }).map((_, i) => (
              <div key={"empty-" + i} style={{ ...styles.playerChip, opacity: 0.35 }}>
                <div style={{ ...styles.playerAvatar, background: "#E0DDD5" }}>?</div>
                <span style={styles.playerName}>Open spot</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={styles.cta}>
        {joined ? (
          <div style={styles.joinedState}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span style={styles.joinedText}>You're in — see you there</span>
          </div>
        ) : (
          <button style={styles.joinBtn} onClick={() => setJoined(true)}>
            Join game · {game.spotsRemaining} {game.spotsRemaining === 1 ? "spot" : "spots"} left
          </button>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, muted }) {
  return (
    <div style={styles.infoRow}>
      <div style={styles.infoIcon}>{icon}</div>
      <div>
        <p style={styles.infoLabel}>{label}</p>
        <p style={{ ...styles.infoValue, color: muted ? "#B4B2A9" : "#2C2C2A" }}>{value}</p>
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: "1px", background: "#F1EFE8", margin: "4px 0" }} />;
}

function ClockIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888780" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
}
function PinIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888780" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>;
}
function PersonIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888780" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function StarIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888780" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
}

const styles = {
  screen: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 20px", borderBottom: "1px solid #E0DDD5", background: "#F1EFE8",
  },
  backBtn: { background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" },
  headerTitle: { fontSize: "15px", fontWeight: 600, color: "#2C2C2A" },
  body: { flex: 1, overflowY: "auto", padding: "20px 16px 16px", display: "flex", flexDirection: "column", gap: "12px" },
  titleBlock: { display: "flex", flexDirection: "column", gap: "8px" },
  titleRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" },
  gameName: { fontSize: "22px", fontWeight: 700, color: "#2C2C2A", margin: 0, lineHeight: 1.2 },
  formatBadge: { fontSize: "12px", fontWeight: 600, color: "#085041", background: "#E1F5EE", padding: "4px 12px", borderRadius: "20px", whiteSpace: "nowrap", flexShrink: 0 },
  spotsBadge: { fontSize: "13px", fontWeight: 600, padding: "5px 12px", borderRadius: "20px", alignSelf: "flex-start" },
  infoCard: { background: "white", borderRadius: "14px", padding: "4px 16px", border: "1px solid #E0DDD5" },
  infoRow: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 0" },
  infoIcon: { width: "32px", height: "32px", background: "#F1EFE8", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoLabel: { fontSize: "11px", color: "#B4B2A9", fontWeight: 500, margin: "0 0 2px" },
  infoValue: { fontSize: "14px", fontWeight: 500, margin: 0 },
  noteCard: { background: "white", borderRadius: "14px", padding: "14px 16px", border: "1px solid #E0DDD5" },
  noteLabel: { fontSize: "11px", color: "#B4B2A9", fontWeight: 500, margin: "0 0 6px" },
  noteText: { fontSize: "14px", color: "#2C2C2A", margin: 0, lineHeight: 1.5 },
  section: { display: "flex", flexDirection: "column", gap: "10px" },
  sectionLabel: { fontSize: "12px", fontWeight: 600, color: "#888780", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" },
  playerList: { display: "flex", flexDirection: "column", gap: "6px" },
  playerChip: { display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: "white", borderRadius: "10px", border: "1px solid #E0DDD5" },
  playerAvatar: { width: "28px", height: "28px", borderRadius: "50%", background: "#1D9E75", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0 },
  playerName: { fontSize: "14px", fontWeight: 500, color: "#2C2C2A" },
  cta: { padding: "12px 16px 20px", background: "#F1EFE8", borderTop: "1px solid #E0DDD5" },
  joinBtn: { width: "100%", background: "#1D9E75", color: "white", border: "none", borderRadius: "12px", padding: "16px", fontSize: "15px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  joinedState: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "16px" },
  joinedText: { fontSize: "15px", fontWeight: 600, color: "#1D9E75" },
};