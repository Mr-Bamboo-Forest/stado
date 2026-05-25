import { useState } from "react";

const formats = ["5-a-side", "6-a-side", "7-a-side", "11-a-side", "Futsal"];

export default function PostGame() {
  const [format, setFormat] = useState("5-a-side");
  const [posted, setPosted] = useState(false);

  if (posted) {
    return (
      <div style={styles.successScreen}>
        <div style={styles.successIcon}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2 style={styles.successTitle}>Game posted</h2>
        <p style={styles.successSub}>Players nearby will be notified. See you on the pitch.</p>
      </div>
    );
  }

  return (
    <div style={styles.screen}>
      <div style={styles.topBar}>
        <span style={styles.wordmark}>Post a game</span>
      </div>

      <div style={styles.body}>
        <Field label="Game name">
          <input style={styles.input} placeholder="e.g. South Bank Kick-around" />
        </Field>

        <Field label="Format">
          <div style={styles.formatGrid}>
            {formats.map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                style={{ ...styles.formatBtn, ...(format === f ? styles.formatBtnActive : {}) }}
              >
                {f}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Location">
          <input style={styles.input} placeholder="Park or street name" />
        </Field>

        <div style={styles.row}>
          <Field label="Date" style={{ flex: 1 }}>
            <input style={styles.input} type="date" />
          </Field>
          <Field label="Time" style={{ flex: 1 }}>
            <input style={styles.input} type="time" />
          </Field>
        </div>

        <Field label="Max players">
          <input style={styles.input} type="number" placeholder="10" min="2" max="30" />
        </Field>

        <Field label="Note (optional)">
          <textarea
            style={{ ...styles.input, height: "80px", resize: "none" }}
            placeholder="Anything players should know..."
          />
        </Field>
      </div>

      <div style={styles.cta}>
        <button style={styles.postBtn} onClick={() => setPosted(true)}>
          Post game
        </button>
      </div>
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", ...style }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  screen: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topBar: { padding: "18px 20px 14px", borderBottom: "1px solid #E0DDD5", background: "#F1EFE8" },
  wordmark: { fontSize: "18px", fontWeight: 700, color: "#2C2C2A" },
  body: { flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" },
  label: { fontSize: "12px", fontWeight: 600, color: "#888780", textTransform: "uppercase", letterSpacing: "0.4px" },
  input: {
    width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1.5px solid #E0DDD5",
    fontSize: "14px", color: "#2C2C2A", background: "white", fontFamily: "inherit",
    boxSizing: "border-box", outline: "none",
  },
  row: { display: "flex", gap: "12px" },
  formatGrid: { display: "flex", flexWrap: "wrap", gap: "8px" },
  formatBtn: {
    padding: "8px 14px", borderRadius: "20px", border: "1.5px solid #E0DDD5",
    fontSize: "13px", fontWeight: 500, cursor: "pointer", background: "white",
    color: "#888780", fontFamily: "inherit",
  },
  formatBtnActive: { background: "#1D9E75", borderColor: "#1D9E75", color: "white" },
  cta: { padding: "12px 16px 20px", background: "#F1EFE8", borderTop: "1px solid #E0DDD5" },
  postBtn: {
    width: "100%", background: "#1D9E75", color: "white", border: "none",
    borderRadius: "12px", padding: "16px", fontSize: "15px", fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit",
  },
  successScreen: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: "16px", padding: "40px",
  },
  successIcon: {
    width: "72px", height: "72px", borderRadius: "50%", background: "#1D9E75",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  successTitle: { fontSize: "24px", fontWeight: 700, color: "#2C2C2A", margin: 0 },
  successSub: { fontSize: "15px", color: "#888780", textAlign: "center", margin: 0, lineHeight: 1.5 },
};