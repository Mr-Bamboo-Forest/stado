import { useEffect, useState } from "react";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Profile({ onSignOut }) {
  const auth = getAuth();
  const user = auth.currentUser;
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    getDoc(ref).then((snap) => {
      if (snap.exists()) {
        setUserData(snap.data());
      } else {
        const newUser = {
          name: user.displayName || "Player",
          email: user.email,
          photoURL: user.photoURL,
          gamesAttended: 0,
          gamesHosted: 0,
          preferredPositions: [],
          createdAt: new Date(),
        };
        setDoc(ref, newUser);
        setUserData(newUser);
      }
    });
  }, [user]);

  const handleSignOut = async () => {
    await signOut(auth);
    onSignOut();
  };

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "?";

  const menuItems = [
    { label: "Edit profile", icon: "edit" },
    { label: "Notification settings", icon: "bell" },
    { label: "Privacy", icon: "lock" },
    { label: "Help & support", icon: "help" },
    { label: "Sign out", icon: "signout", danger: true, action: handleSignOut },
  ];

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <span style={styles.wordmark}>stado</span>
      </header>

      <div style={styles.content}>
        <div style={styles.profileCard}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt="avatar" style={styles.avatarImg} />
          ) : (
            <div style={styles.avatar}>
              <span style={styles.avatarText}>{initials}</span>
            </div>
          )}
          <h2 style={styles.name}>{user?.displayName || "Player"}</h2>
          <p style={styles.email}>{user?.email}</p>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.stat}>
            <p style={styles.statValue}>{userData?.gamesAttended ?? 0}</p>
            <p style={styles.statLabel}>Games</p>
          </div>
          <div style={styles.stat}>
            <p style={styles.statValue}>{userData?.gamesHosted ?? 0}</p>
            <p style={styles.statLabel}>Hosted</p>
          </div>
          <div style={styles.stat}>
            <p style={styles.statValue}>{userData?.preferredPositions?.length ?? 0}</p>
            <p style={styles.statLabel}>Positions</p>
          </div>
        </div>

        <div style={styles.section}>
          {menuItems.map((item, i) => (
            <button
              key={i}
              onClick={item.action || undefined}
              style={{ ...styles.menuItem, color: item.danger ? "#D63D3D" : "#2C2C2A" }}
            >
              <span style={styles.menuLabel}>{item.label}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  screen: { flex: 1, display: "flex", flexDirection: "column", background: "#F1EFE8" },
  header: { padding: "16px 20px 12px" },
  wordmark: { fontSize: "24px", fontWeight: "700", letterSpacing: "-0.5px", color: "#085041" },
  content: { flex: 1, overflowY: "auto", padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: "16px" },
  profileCard: { background: "white", borderRadius: "16px", padding: "24px 20px", border: "1px solid #E0DDD5", textAlign: "center" },
  avatar: { width: "80px", height: "80px", borderRadius: "50%", background: "#1D9E75", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" },
  avatarImg: { width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", margin: "0 auto 12px", display: "block" },
  avatarText: { fontSize: "28px", fontWeight: "700", color: "white" },
  name: { fontSize: "20px", fontWeight: "700", color: "#2C2C2A", marginBottom: "2px" },
  email: { fontSize: "14px", color: "#7A7A72" },
  statsRow: { display: "flex", justifyContent: "space-around", background: "white", borderRadius: "16px", padding: "20px 0", border: "1px solid #E0DDD5" },
  stat: { textAlign: "center" },
  statValue: { fontSize: "24px", fontWeight: "700", color: "#2C2C2A" },
  statLabel: { fontSize: "12px", color: "#7A7A72", fontWeight: "500" },
  section: { background: "white", borderRadius: "16px", padding: "0 16px", border: "1px solid #E0DDD5" },
  menuItem: { width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "16px 0", background: "none", border: "none", borderBottom: "1px solid #E0DDD5", cursor: "pointer" },
  menuLabel: { flex: 1, textAlign: "left", fontSize: "15px", fontWeight: "500" },
};
