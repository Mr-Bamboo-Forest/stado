export default function NoShowWarningModal({ rate, onConfirm, onCancel }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.iconWrap}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E24B4A" strokeWidth="2" strokeLinecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h3 style={styles.title}>High no-show rate</h3>
        <p style={styles.body}>
          Your no-show rate over the last 6 months is{" "}
          <strong style={{ color: "#E24B4A" }}>{rate}%</strong>. Hosts can see
          this when you join a game.
        </p>
        <p style={styles.body}>
          By joining, you commit to attending. Repeated no-shows affect your
          standing in the community.
        </p>
        <p style={styles.confirm}>Do you still want to join?</p>
        <div style={styles.buttons}>
          <button onClick={onCancel} style={styles.cancelBtn}>
            Cancel
          </button>
          <button onClick={onConfirm} style={styles.joinBtn}>
            Yes, I will attend
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "24px",
  },
  modal: {
    background: "white",
    borderRadius: "20px",
    padding: "28px 24px 24px",
    width: "100%",
    maxWidth: "340px",
  },
  iconWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "16px",
  },
  title: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#2C2C2A",
    textAlign: "center",
    marginBottom: "12px",
  },
  body: {
    fontSize: "14px",
    color: "#555550",
    lineHeight: "1.6",
    marginBottom: "10px",
    textAlign: "center",
  },
  confirm: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#2C2C2A",
    textAlign: "center",
    marginBottom: "20px",
    marginTop: "4px",
  },
  buttons: {
    display: "flex",
    gap: "10px",
  },
  cancelBtn: {
    flex: 1,
    padding: "12px 0",
    borderRadius: "12px",
    border: "1px solid #E0DDD5",
    background: "white",
    color: "#555550",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  joinBtn: {
    flex: 2,
    padding: "12px 0",
    borderRadius: "12px",
    border: "none",
    background: "#1D9E75",
    color: "white",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
};