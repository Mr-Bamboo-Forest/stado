export default function Profile() {
  return (
    <div style={styles.screen}>
      <div style={styles.topBar}>
        <span style={styles.wordmark}>Profile</span>
      </div>

      <div style={styles.body}>
        {/* Avatar */}
        <div style={styles.avatarSection}>
          <div style={styles.avatar}>D</div>
          <div>
            <p style={styles.name}>Dhruv</p>
            <div style={styles.verifiedBadge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#085041" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Phone verified
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          <StatCard value="12" label="Games attended" />
          <StatCard value="3" label="Games hosted" />
          <StatCard value="100%" label="Show-up rate" />
        </div>

        {/* Positions */}
        <div style={styles.section}>
          <p style={styles.sectionLabel}>Preferred positions</p>
          <div style={styles.positionRow}>
            {["Midfielder", "Winger"].map((p) => (
              <span key={p} style={styles.positionChip}>{p}</span>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div style={styles.menuCard}>
          <MenuItem label="Edit profile" />
          <div style={styles.menuDivider} />
          <MenuItem label="Notification settings" />
          <div style={styles.menuDivider} />
          <MenuItem label="Upgrade to Regular — $4.99/mo" highlight />
          <div style={styles.menuDivider} />
          <MenuItem label="Sign out" danger />
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div style={styles.statCard}>
      <p style={styles.statValue}>{value}</p>
      <p style={styles.statLabel}>{label}</p>
    </div>
  );
}

function MenuItem({ label, highlight, danger }) {
  return (
    <div style={styles.menuItem}>
      <span style={{
        ...styles.menuLabel,
        color: danger ? "#A32D2D" : highlight ? "#1D9E75" : "#2C2C2A",
        fontWeight: highlight ? 600 : 400,
      }}>
        {label}
      </span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D3D1C7" strokeWidth="2">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  );
}

const styles = {
  screen: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topBar: { padding: "18px 20px 14px", borderBottom: "1px solid #E0DDD5", background: "#F1EFE8" },
  wordmark: { fontSize: "18px", fontWeight: 700, color: "#2C2C2A" },
  body: { flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" },
  avatarSection: { display: "flex", alignItems: "center", gap: "16px" },
  avatar: {
    width: "64px", height: "64px", borderRadius: "50%", background: "#1D9E75",
    color: "white", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "24px", fontWeight: 700, flexShrink: 0,
  },
  name: { fontSize: "20px", fontWeight: 700, color: "#2C2C2A", margin: "0 0 6px" },
  verifiedBadge: {
    display: "inline-flex", alignItems: "center", gap: "5px",
    background: "#E1F5EE", color: "#085041", fontSize: "12px", fontWeight: 600,
    padding: "4px 10px", borderRadius: "20px",
  },
  statsRow: { display: "flex", gap: "8px" },
  statCard: {
    flex: 1, background: "white", borderRadius: "12px", padding: "12px",
    border: "1px solid #E0DDD5", textAlign: "center",
  },
  statValue: { fontSize: "20px", fontWeight: 700, color: "#2C2C2A", margin: "0 0 4px" },
  statLabel: { fontSize: "11px", color: "#888780", margin: 0, lineHeight: 1.3 },
  section: { display: "flex", flexDirection: "column", gap: "10px" },
  sectionLabel: { fontSize: "12px", fontWeight: 600, color: "#888780", margin: 0, textTransform: "uppercase", letterSpacing: "0.4px" },
  positionRow: { display: "flex", gap: "8px", flexWrap: "wrap" },
  positionChip: {
    background: "white", border: "1.5px solid #E0DDD5", borderRadius: "20px",
    padding: "6px 14px", fontSize: "13px", fontWeight: 500, color: "#2C2C2A",
  },
  menuCard: { background: "white", borderRadius: "14px", border: "1px solid #E0DDD5", overflow: "hidden" },
  menuItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px" },
  menuLabel: { fontSize: "14px" },
  menuDivider: { height: "1px", background: "#F1EFE8", margin: "0 16px" },
};