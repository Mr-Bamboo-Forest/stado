import { useEffect, useState, useRef } from "react";
import { getAuth, signOut, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Winger", "Striker"];

const FAQ = [
  { q: "How do I join a game?", a: "Tap any game on Discover, then tap Join to reveal the location details." },
  { q: "How do I host a game?", a: "Tap the Post tab, fill in the details, and your game goes live instantly." },
  { q: "Is stado free?", a: "Yes — the core features are free. A Regular tier with extra perks is coming soon." },
  { q: "How do I contact support?", a: "Email us at support@stado.app and we'll get back to you within 24 hours." },
];

export default function Profile({ onBack, userData, onUpdateUser }) {
  const auth = getAuth();
  const user = auth.currentUser;
  const [localUserData, setLocalUserData] = useState(userData);
  const [activePanel, setActivePanel] = useState(null);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    if (userData) {
      setLocalUserData(userData);
    }
  }, [userData]);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    getDoc(ref).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLocalUserData(data);
      }
    });
  }, [user]);

  const togglePanel = (panel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
    setNameError("");
    if (panel === "edit") setEditName(user?.displayName || localUserData?.name || "");
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    setUploadingPhoto(true);
    try {
      const storageRef = ref(storage, `users/${user.uid}/avatar`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);

      await updateProfile(user, { photoURL });
      await updateDoc(doc(db, "users", user.uid), { photoURL });

      setLocalUserData((prev) => ({ ...prev, photoURL }));
      onUpdateUser?.({ ...localUserData, photoURL });
    } catch (err) {
      console.error("Error uploading photo:", err);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed) { setNameError("Name can't be empty."); return; }
    if (trimmed.length > 30) { setNameError("Max 30 characters."); return; }
    setSavingName(true);
    try {
      await updateProfile(user, { displayName: trimmed });
      await updateDoc(doc(db, "users", user.uid), { name: trimmed });
      setLocalUserData((prev) => ({ ...prev, name: trimmed }));
      onUpdateUser?.({ ...localUserData, name: trimmed });
      setActivePanel(null);
    } catch {
      setNameError("Failed to save. Try again.");
    }
    setSavingName(false);
  };

  const handleRequestNotifs = async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const initials = localUserData?.name
    ? localUserData.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "?";

  const menuItems = [
    { key: "edit", label: "Edit profile" },
    { key: "notifications", label: "Notification settings" },
    { key: "help", label: "Help & support" },
    { key: "signout", label: "Sign out", danger: true, action: handleSignOut },
  ];

  const notifStatusLabel = {
    granted: "Enabled",
    denied: "Blocked in browser",
    default: "Not enabled",
  }[notifPermission];

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <span style={styles.wordmark}>stado</span>
      </header>

      <div style={styles.content}>
        <div style={styles.profileCard}>
          <button
            style={styles.avatarBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
          >
            {localUserData?.photoURL ? (
              <img src={localUserData.photoURL} alt="avatar" style={styles.avatarImg} />
            ) : (
              <div style={styles.avatar}>
                <span style={styles.avatarText}>{initials}</span>
              </div>
            )}
            <div style={styles.photoOverlay}>
              {uploadingPhoto ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                  <path d="M12 6v6l4 2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M5 12h14M12 5v14" />
                </svg>
              )}
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoChange}
          />
          <h2 style={styles.name}>{localUserData?.name || user?.displayName || "Player"}</h2>
          <p style={styles.email}>{user?.email}</p>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.stat}>
            <p style={styles.statValue}>{localUserData?.gamesAttended ?? 0}</p>
            <p style={styles.statLabel}>Games</p>
          </div>
          <div style={styles.stat}>
            <p style={styles.statValue}>{localUserData?.gamesHosted ?? 0}</p>
            <p style={styles.statLabel}>Hosted</p>
          </div>
          <div style={styles.stat}>
            <p style={styles.statValue}>{localUserData?.preferredPositions?.length ?? 0}</p>
            <p style={styles.statLabel}>Positions</p>
          </div>
        </div>

        {localUserData?.preferredPositions?.length > 0 && (
          <div style={styles.positionsSection}>
            <p style={styles.positionsLabel}>Preferred positions</p>
            <div style={styles.positionsList}>
              {localUserData.preferredPositions.map((pos) => (
                <span key={pos} style={styles.positionChip}>
                  {pos.charAt(0).toUpperCase() + pos.slice(1)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={styles.section}>
          {menuItems.map((item, i) => (
            <div key={item.key}>
              <button
                onClick={item.action || (() => togglePanel(item.key))}
                style={{
                  ...styles.menuItem,
                  color: item.danger ? "#D63D3D" : "#2C2C2A",
                  borderBottom: activePanel === item.key ? "none" : (i < menuItems.length - 1 ? "1px solid #E0DDD5" : "none"),
                }}
              >
                <span style={styles.menuLabel}>{item.label}</span>
                {!item.action && (
                  <svg
                    width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    style={{
                      transform: activePanel === item.key ? "rotate(90deg)" : "none",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                )}
                {item.action && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                )}
              </button>

              {item.key === "edit" && activePanel === "edit" && (
                <div style={styles.panel}>
                  <p style={styles.panelLabel}>Display name</p>
                  <input
                    value={editName}
                    onChange={(e) => { setEditName(e.target.value); setNameError(""); }}
                    style={styles.input}
                    placeholder="Your name"
                    maxLength={30}
                  />
                  {nameError && <p style={styles.errorText}>{nameError}</p>}
                  <div style={styles.panelRow}>
                    <span style={styles.charCount}>{editName.length}/30</span>
                    <button
                      onClick={handleSaveName}
                      disabled={savingName}
                      style={styles.saveBtn}
                    >
                      {savingName ? "Saving..." : "Save"}
                    </button>
                  </div>
                  <p style={styles.panelHint}>
                    Tap your profile photo above to change it.
                  </p>
                </div>
              )}

              {item.key === "notifications" && activePanel === "notifications" && (
                <div style={styles.panel}>
                  <div style={styles.settingRow}>
                    <div>
                      <p style={styles.settingTitle}>Push notifications</p>
                      <p style={styles.settingSubtitle}>{notifStatusLabel}</p>
                    </div>
                    {notifPermission === "default" && (
                      <button onClick={handleRequestNotifs} style={styles.smallBtn}>
                        Enable
                      </button>
                    )}
                    {notifPermission === "granted" && (
                      <div style={styles.badge}>On</div>
                    )}
                    {notifPermission === "denied" && (
                      <div style={{ ...styles.badge, background: "#fde8e8", color: "#D63D3D" }}>Blocked</div>
                    )}
                  </div>
                  {notifPermission === "denied" && (
                    <p style={styles.panelHint}>
                      Notifications are blocked. To enable them, update your browser settings for this site.
                    </p>
                  )}
                </div>
              )}

              {item.key === "help" && activePanel === "help" && (
                <div style={styles.panel}>
                  {FAQ.map((faq, fi) => (
                    <div key={fi} style={{ borderBottom: fi < FAQ.length - 1 ? "1px solid #E0DDD5" : "none" }}>
                      <button
                        onClick={() => setOpenFaq(openFaq === fi ? null : fi)}
                        style={styles.faqQuestion}
                      >
                        <span style={styles.faqLabel}>{faq.q}</span>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="#7A7A72" strokeWidth="2"
                          style={{
                            flexShrink: 0,
                            transform: openFaq === fi ? "rotate(180deg)" : "none",
                            transition: "transform 0.2s ease",
                          }}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                      {openFaq === fi && (
                        <p style={styles.faqAnswer}>{faq.a}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
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
  content: { flex: 1, overflowY: "auto", padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "calc(16px + env(safe-area-inset-bottom))" },
  profileCard: { background: "white", borderRadius: "16px", padding: "24px 20px", border: "1px solid #E0DDD5", textAlign: "center" },
  avatarBtn: { position: "relative", margin: "0 auto 12px", padding: 0, border: "none", background: "none", cursor: "pointer" },
  avatar: { width: "80px", height: "80px", borderRadius: "50%", background: "#1D9E75", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" },
  avatarImg: { width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", margin: "0 auto", display: "block" },
  avatarText: { fontSize: "28px", fontWeight: "700", color: "white" },
  photoOverlay: { position: "absolute", bottom: 0, right: 0, width: "28px", height: "28px", borderRadius: "50%", background: "#085041", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" },
  name: { fontSize: "20px", fontWeight: "700", color: "#2C2C2A", marginBottom: "2px" },
  email: { fontSize: "14px", color: "#7A7A72" },
  statsRow: { display: "flex", justifyContent: "space-around", background: "white", borderRadius: "16px", padding: "20px 0", border: "1px solid #E0DDD5" },
  stat: { textAlign: "center" },
  statValue: { fontSize: "24px", fontWeight: "700", color: "#2C2C2A" },
  statLabel: { fontSize: "12px", color: "#7A7A72", fontWeight: "500" },
  positionsSection: { background: "white", borderRadius: "16px", padding: "16px", border: "1px solid #E0DDD5" },
  positionsLabel: { fontSize: "13px", fontWeight: "600", color: "#7A7A72", marginBottom: "10px" },
  positionsList: { display: "flex", flexWrap: "wrap", gap: "8px" },
  positionChip: { fontSize: "13px", fontWeight: "500", padding: "6px 12px", background: "#E1F5EE", color: "#085041", borderRadius: "100px" },
  section: { background: "white", borderRadius: "16px", padding: "0 16px", border: "1px solid #E0DDD5" },
  menuItem: { width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "16px 0", background: "none", border: "none", cursor: "pointer" },
  menuLabel: { flex: 1, textAlign: "left", fontSize: "15px", fontWeight: "500" },

  panel: { paddingBottom: "16px", borderBottom: "1px solid #E0DDD5" },
  panelLabel: { fontSize: "13px", fontWeight: "600", color: "#7A7A72", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em" },
  panelHint: { fontSize: "13px", color: "#7A7A72", marginTop: "10px", lineHeight: "1.5" },
  panelRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" },
  charCount: { fontSize: "13px", color: "#7A7A72" },

  input: { width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #D0CEC6", fontSize: "15px", color: "#2C2C2A", background: "#F8F7F3", boxSizing: "border-box", outline: "none" },
  errorText: { fontSize: "13px", color: "#D63D3D", marginTop: "6px" },
  saveBtn: { padding: "8px 20px", borderRadius: "20px", background: "#085041", color: "white", border: "none", fontSize: "14px", fontWeight: "600", cursor: "pointer" },

  settingRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" },
  settingTitle: { fontSize: "15px", fontWeight: "500", color: "#2C2C2A" },
  settingSubtitle: { fontSize: "13px", color: "#7A7A72", marginTop: "2px" },
  smallBtn: { padding: "7px 16px", borderRadius: "20px", background: "#085041", color: "white", border: "none", fontSize: "13px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" },
  badge: { padding: "4px 10px", borderRadius: "20px", background: "#e6f7f2", color: "#085041", fontSize: "13px", fontWeight: "600" },

  toggle: { width: "44px", height: "26px", borderRadius: "13px", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s ease", flexShrink: 0, padding: 0 },
  toggleKnob: { position: "absolute", top: "3px", width: "20px", height: "20px", borderRadius: "50%", background: "white", transition: "transform 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" },

  faqQuestion: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "13px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left" },
  faqLabel: { fontSize: "14px", fontWeight: "500", color: "#2C2C2A", lineHeight: "1.4" },
  faqAnswer: { fontSize: "14px", color: "#7A7A72", lineHeight: "1.6", paddingBottom: "12px" },
};
