import { useState } from "react";
import { NoShowDot } from "./NoShowBadge";

export default function AttendanceModal({ game, playerProfiles, onConfirm, onCancel }) {
  const [attendance, setAttendance] = useState(() => {
    const init = {};
    (game.playerUids || []).forEach((uid) => {
      init[uid] = null;
    });
    return init;
  });
  const [submitting, setSubmitting] = useState(false);

  const toggle = (uid, val) => {
    setAttendance((prev) => ({ ...prev, [uid]: val }));
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    await onConfirm(attendance);
    setSubmitting(false);
  };

  const allMarked = Object.values(attendance).every((v) => v !== null);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={styles.title}>Mark attendance</h3>
        <p style={styles.subtitle}>
          Who showed up to <strong>{game.name}</strong>?
        </p>

        <div style={styles.playerList}>
          {(game.playerUids || []).map((uid) => {
            const profile = playerProfiles[uid] || {};
            const name = profile.name || "Player";
            const rate = profile.noShowRate || 0;
            const val = attendance[uid];

            return (
              <div key={uid} style={styles.playerRow}>
                <div style={styles.playerInfo}>
                  <div style={styles.avatar}>
                    {name[0]?.toUpperCase() || "?"}
                  </div>
                  <span style={styles.playerName}>
                    {name}
                    {rate >= 10 && <NoShowDot rate={rate} size={7} />}
                  </span>
                </div>
                <div style={styles.toggleGroup}>
                  <button
                    onClick={() => toggle(uid, true)}
                    style={{
                      ...styles.toggleBtn,
                      background: val === true ? "#E1F5EE" : "white",
                      borderColor: val === true ? "#1D9E75" : "#E0DDD5",
                      color: val === true ? "#085041" : "#7A7A72",
                    }}
                  >
                    Showed
                  </button>
                  <button
                    onClick={() => toggle(uid, false)}
                    style={{
                      ...styles.toggleBtn,
                      background: val === false ? "#FCEBEB" : "white",
                      borderColor: val === false ? "#E24B4A" : "#E0DDD5",
                      color: val === false ? "#A32D2D" : "#7A7A72",
                    }}
                  >
                    No-show
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {!allMarked && (
          <p style={styles.hint}>
            Players not marked will have no effect on their stats.
          </p>
        )}

        <div style={styles.buttons}>
          <button
            onClick={onCancel}
            style={styles.cancelBtn}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{ ...styles.confirmBtn, opacity: submitting ? 0.7 : 1 }}
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Confirm & complete game"}
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
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 1000,
    padding: "0",
  },
  modal: {
    background: "white",
    borderRadius: "24px 24px 0 0",
    padding: "24px 20px 32px",
    width: "100%",
    maxWidth: "430px",
    maxHeight: "80vh",
    overflowY: "auto",
  },
  title: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#2C2C2A",
    marginBottom: "4px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#7A7A72",
    marginBottom: "20px",
  },
  playerList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "16px",
  },
  playerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  playerInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "#1D9E75",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "600",
    flexShrink: 0,
  },
  playerName: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#2C2C2A",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  toggleGroup: {
    display: "flex",
    gap: "6px",
    flexShrink: 0,
  },
  toggleBtn: {
    padding: "6px 10px",
    borderRadius: "8px",
    border: "1px solid",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  hint: {
    fontSize: "12px",
    color: "#7A7A72",
    marginBottom: "16px",
    fontStyle: "italic",
  },
  buttons: {
    display: "flex",
    gap: "10px",
    marginTop: "4px",
  },
  cancelBtn: {
    flex: 1,
    padding: "13px 0",
    borderRadius: "12px",
    border: "1px solid #E0DDD5",
    background: "white",
    color: "#555550",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  confirmBtn: {
    flex: 2,
    padding: "13px 0",
    borderRadius: "12px",
    border: "none",
    background: "#085041",
    color: "white",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
};