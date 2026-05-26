import { useState } from "react";
import { getAuth } from "firebase/auth";
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { notifyFriendsOfGame } from "../utils/social";

const FORMATS = ["5-a-side", "6-a-side", "7-a-side", "11-a-side"];
const SKILLS = ["Any level", "Casual", "Intermediate", "Competitive"];

export default function PostGame({ onBack }) {
  const auth = getAuth();
  const user = auth.currentUser;

  const [form, setForm] = useState({
    name: "",
    format: "5-a-side",
    location: "",
    date: "",
    time: "",
    spots: "10",
    skill: "Any level",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const hostName = userSnap.data()?.name || user.displayName || "Player";

      const gameRef = await addDoc(collection(db, "games"), {
        name: form.name,
        format: form.format,
        location: form.location,
        distance: "",
        date: form.date,
        time: form.time,
        spotsTotal: parseInt(form.spots, 10),
        spotsRemaining: parseInt(form.spots, 10) - 1,
        host: hostName,
        hostUid: user.uid,
        skill: form.skill,
        note: form.note || "",
        players: [hostName],
        playerUids: [user.uid],
        completed: false,
        attendance: {},
        createdAt: serverTimestamp(),
      });

      // Update host's gamesHosted count
      await updateDoc(doc(db, "users", user.uid), {
        gamesHosted: (userSnap.data()?.gamesHosted || 0) + 1,
      });

      // Notify friends
      await notifyFriendsOfGame(user.uid, hostName, gameRef.id, form.name);

      onBack();
    } catch (error) {
      console.error("Error adding game:", error);
      alert("Failed to post game. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.closeBtn} onClick={onBack} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2C2C2A" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <span style={styles.headerTitle}>Post a game</span>
        <div style={styles.headerSpacer} />
      </header>

      <form style={styles.form} onSubmit={handleSubmit}>
        <div style={styles.field}>
          <label style={styles.label}>Game name</label>
          <input
            style={styles.input} type="text"
            placeholder="e.g. South Bank Sunday Kickaround"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required disabled={submitting}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Format</label>
          <div style={styles.formatGrid}>
            {FORMATS.map((f) => (
              <button key={f} type="button"
                style={{
                  ...styles.formatBtn,
                  background: form.format === f ? "#085041" : "white",
                  color: form.format === f ? "white" : "#2C2C2A",
                  borderColor: form.format === f ? "#085041" : "#E0DDD5",
                }}
                onClick={() => handleChange("format", f)} disabled={submitting}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Date</label>
            <input style={{ ...styles.input, ...styles.inputSmall }} type="date"
              value={form.date} onChange={(e) => handleChange("date", e.target.value)}
              required disabled={submitting} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Time</label>
            <input style={{ ...styles.input, ...styles.inputSmall }} type="time"
              value={form.time} onChange={(e) => handleChange("time", e.target.value)}
              required disabled={submitting} />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Location</label>
          <input style={styles.input} type="text" placeholder="Park or field name"
            value={form.location} onChange={(e) => handleChange("location", e.target.value)}
            required disabled={submitting} />
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Total spots</label>
            <select style={{ ...styles.input, ...styles.inputSmall }}
              value={form.spots} onChange={(e) => handleChange("spots", e.target.value)}
              disabled={submitting}>
              {[6, 8, 10, 12, 14, 16, 18, 22].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Skill level</label>
            <select style={{ ...styles.input, ...styles.inputSmall }}
              value={form.skill} onChange={(e) => handleChange("skill", e.target.value)}
              disabled={submitting}>
              {SKILLS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Note (optional)</label>
          <textarea style={styles.textarea} placeholder="Any extra info for players..."
            value={form.note} onChange={(e) => handleChange("note", e.target.value)}
            rows={3} disabled={submitting} />
        </div>

        <button style={{ ...styles.submitBtn, opacity: submitting ? 0.7 : 1 }} type="submit" disabled={submitting}>
          {submitting ? "Posting..." : "Post game"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  screen: { flex: 1, display: "flex", flexDirection: "column", background: "#F1EFE8" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 16px", background: "white", borderBottom: "1px solid #E0DDD5", flexShrink: 0,
  },
  closeBtn: {
    width: "40px", height: "40px", display: "flex", alignItems: "center",
    justifyContent: "center", borderRadius: "12px", background: "none", border: "none", cursor: "pointer",
  },
  headerTitle: { fontSize: "16px", fontWeight: "600", color: "#2C2C2A" },
  headerSpacer: { width: "40px" },
  form: {
    flex: 1, overflowY: "auto", padding: "20px 16px",
    display: "flex", flexDirection: "column", gap: "16px",
  },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "13px", fontWeight: "600", color: "#2C2C2A" },
  input: {
    width: "100%", padding: "12px 14px", fontSize: "15px", background: "white",
    border: "1px solid #E0DDD5", borderRadius: "10px", color: "#2C2C2A", outline: "none",
  },
  inputSmall: { width: "auto" },
  textarea: {
    width: "100%", padding: "12px 14px", fontSize: "15px", background: "white",
    border: "1px solid #E0DDD5", borderRadius: "10px", color: "#2C2C2A",
    outline: "none", resize: "none", fontFamily: "inherit",
  },
  row: { display: "flex", gap: "12px" },
  formatGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" },
  formatBtn: {
    padding: "10px 0", fontSize: "14px", fontWeight: "500",
    borderRadius: "10px", border: "1px solid", cursor: "pointer", transition: "all 0.15s ease",
  },
  submitBtn: {
    width: "100%", padding: "14px 0", background: "#1D9E75", color: "white",
    fontSize: "15px", fontWeight: "600", borderRadius: "12px", border: "none",
    cursor: "pointer", marginTop: "auto",
  },
};