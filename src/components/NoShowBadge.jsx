// Reusable no-show badge and indicator components

export function NoShowBadge({ rate }) {
  if (!rate || rate < 10) return null;
  return (
    <span style={styles.badge}>
      {rate}% no-show
    </span>
  );
}

export function NoShowDot({ rate, size = 8 }) {
  if (!rate || rate < 10) return null;
  return (
    <span
      style={{
        ...styles.dot,
        width: size,
        height: size,
        minWidth: size,
      }}
      title={`${rate}% no-show rate`}
    />
  );
}

// Wraps a player name with a red dot if they have high no-show rate
export function PlayerName({ name, noShowRate, style: extraStyle }) {
  const flagged = noShowRate && noShowRate >= 10;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, ...extraStyle }}>
      {name}
      {flagged && <NoShowDot rate={noShowRate} size={7} />}
    </span>
  );
}

const styles = {
  badge: {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: "12px",
    background: "#FCEBEB",
    color: "#A32D2D",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  dot: {
    display: "inline-block",
    borderRadius: "50%",
    background: "#E24B4A",
    flexShrink: 0,
  },
};