import { useEffect, useState, useCallback } from "react";
import { getAuth, signOut, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import {
  ensureUserCode,
  getIncomingFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  findUserByCode,
} from "../utils/social";

const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];

const FAQ = [
  { q: "How do I join a game?", a: "Tap any game on Discover, then tap Join to reveal the location details." },
  { q: "How do I host a game?", a: "Tap the Post tab, fill in the details, and your game goes live instantly." },
  { q: "Is stado free?", a: "Yes — the core features are free. A Regular tier with extra perks is coming soon." },
  { q: "How do I contact support?", a: "Email us at support@stado.app and we'll get back to you within 24 hours." },
  { q: "How does the no-show rate work?", a: "After each game, the host marks who attended. Your rate is calculated over your last 6 months of games. Stay above 90% attendance to keep a clean record." },
];

export default function Profile({ onSignOut, onViewProfile }) {
  const auth = getAuth();
  const user = auth.currentUser;
  const [userData, setUserData] = useState(null);
  const [activePanel, setActivePanel] = useState(null);

  // Edit profile
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  // Notifications
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  // Privacy
  const [profilePublic, setProfilePublic] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // FAQ accordion
  const [openFaq, setOpenFaq] = useState(null);

  // Friends
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [requestProfiles, setRequestProfiles] = useState({});
  const [friendProfiles, setFriendProfiles] = useState([]);
  const [findCodeInput, setFindCodeInput] = useState("");
  const [findCodeResult, setFindCodeResult] = useState(null);
  const [findCodeError, setFindCodeError] = useState("");
  const [findCodeLoading, setFindCodeLoading] = useState(false);

  // Notifications panel
  const [appNotifs, setAppNotifs] = useState([]);

  useEffect(() => {
    if (!user) return;
    loadUserData();

    // Listen for incoming friend requests in real time
    const q = query(
      collection(db, "friendRequests"),
      where("toUid", "==", user.uid),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, async (snap) => {
      const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setIncomingRequests(requests);
      // Load profiles for requesters
      const profiles = {};
      await Promise.all(
        requests.map(async (r) => {
          const s = await getDoc(doc(db, "users", r.fromUid));
          if (s.exists()) profiles[r.fromUid] = s.data();
        })
      );
      setRequestProfiles(profiles);
    });

    // Listen for app notifications
    const nq = query(
      collection(db, "notifications"),
      where("toUid", "==", user.uid),
      where("read", "==", false)
    );
    const nUnsub = onSnapshot(nq, (snap) => {
      setAppNotifs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => { unsub(); nUnsub(); };
  }, [user]);

  const loadUserData = async () => {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      setUserData(data);
      setProfilePublic(data.profilePublic !== false);

      // Ensure user has a code
      if (!data.userCode) {
        await ensureUserCode(user.uid);
        const updated = await getDoc(ref);
        setUserData(updated.data());
      }

      // Load friend profiles
      const friendUids = data.friendUids || [];
      if (friendUids.length > 0) {
        const profiles = await Promise.all(
          friendUids.map(async (uid) => {
            const s = await getDoc(doc(db, "users", uid));
            return s.exists() ? { uid, ...s.data() } : null;
          })
        );
        setFriendProfiles(profiles.filter(Boolean));
      }
    } else {
      const newUser = {
        name: user.displayName || "Player",
        email: user.email,
        photoURL: user.photoURL,
        gamesAttended: 0,
        gamesHosted: 0,
        preferredPositions: [],
        profilePublic: true,
        noShowRate: 0,
        friendUids: [],
        createdAt: new Date(),
      };
      await setDoc(ref, newUser);
      setUserData(newUser);
      await ensureUserCode(user.uid);
      const updated = await getDoc(ref);
      setUserData(updated.data());
    }
  };

  const togglePanel = (panel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
    setNameError("");
    if (panel === "edit") setEditName(user?.displayName || "");
    if (panel === "friends") {
      setFindCodeInput("");
      setFindCodeResult(null);
      setFindCodeError("");
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
      setUserData((prev) => ({ ...prev, name: trimmed }));
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

  const handleTogglePrivacy = async (val) => {
    setProfilePublic(val);
    setSavingPrivacy(true);
    await updateDoc(doc(db, "users", user.uid), { profilePublic: val });
    setSavingPrivacy(false);
  };

  const handleAccept = async (requestId, fromUid) => {
    await acceptFriendRequest(requestId, fromUid, user.uid);
    await loadUserData();
  };

  const handleDecline = async (requestId) => {
    await declineFriendRequest(requestId);
  };

  const handleFindByCode = async () => {
    const code = findCodeInput.trim().toUpperCase();
    if (code.length < 6) { setFindCodeError("Enter a 6-character player code."); return; }
    setFindCodeLoading(true);
    setFindCodeError("");
    setFindCodeResult(null);
    const result = await findUserByCode(code);
    if (!result) {
      setFindCodeError("No player found with that code.");
    } else if (result.uid === user.uid) {
      setFindCodeError("That's your own code.");
    } else {
      setFindCodeResult(result);
    }
    setFindCodeLoading(false);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    onSignOut();
  };

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "?";

  const notifCount = incomingRequests.length + appNotifs.length;

  const menuItems = [
    { key: "edit", label: "Edit profile" },
    { key: "friends", label: "Friends", badge: incomingRequests.length },
    { key: "notifications", label: "Notification settings" },
    { key: "activity", label: "Activity", badge: appNotifs.length },
    { key: "privacy", label: "Privacy" },
    { key: "help", label: "Help & support" },
    { key: "signout", label: "Sign out", danger: true, action: handleSignOut },
  ];

  const notifStatusLabel = {
    granted: "Enabled",
    denied: "Blocked in browser",
    default: "Not enabled",
  }[notifPermission];

  const noShowFlagged = (userData?.noShowRate || 0) >= 10;

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <span style={styles.wordmark}>stado</span>
        {notifCount > 0 && (
          <div style={styles.notifBubble}>{notifCount}</div>
        )}
      </header>

      <div style={styles.content}>
        {/* Profile card */}
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
          {userData?.userCode && (
            <div style={styles.codeWrap}>
              <span style={styles.codeLabel}>Player code</span>
              <span style={styles.code}>{userData.userCode}</span>
            </div>
          )}
          {noShowFlagged && (
            <span style={styles.noShowBadge}>
              {userData.noShowRate}% no-show rate
            </span>
          )}
        </div>

        {/* Stats */}
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
            <p style={styles.statValue}>{(userData?.friendUids || []).length}</p>
            <p style={styles.statLabel}>Friends</p>
          </div>
          <div style={styles.stat}>
            <p style={{
              ...styles.statValue,
              color: noShowFlagged ? "#E24B4A" : "#2C2C2A",
            }}>
              {userData?.noShowRate ?? 0}%
            </p>
            <p style={styles.statLabel}>No-show</p>
          </div>
        </div>

        {/* Menu */}
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
                {item.badge > 0 && (
                  <span style={styles.menuBadge}>{item.badge}</span>
                )}
                {!item.action && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transform: activePanel === item.key ? "rotate(90deg)" : "none", transition: "transform 0.2s ease" }}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                )}
                {item.action && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                )}
              </button>

              {/* Edit profile panel */}
              {item.key === "edit" && activePanel === "edit" && (
                <div style={styles.panel}>
                  <p style={styles.panelLabel}>Display name</p>
                  <input value={editName} onChange={(e) => { setEditName(e.target.value); setNameError(""); }}
                    style={styles.input} placeholder="Your name" maxLength={30} />
                  {nameError && <p style={styles.errorText}>{nameError}</p>}
                  <div style={styles.panelRow}>
                    <span style={styles.charCount}>{editName.length}/30</span>
                    <button onClick={handleSaveName} disabled={savingName} style={styles.saveBtn}>
                      {savingName ? "Saving..." : "Save"}
                    </button>
                  </div>
                  <p style={styles.panelHint}>Profile photo is pulled from your Google account.</p>
                </div>
              )}

              {/* Friends panel */}
              {item.key === "friends" && activePanel === "friends" && (
                <div style={styles.panel}>
                  {/* Incoming requests */}
                  {incomingRequests.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <p style={styles.panelSubLabel}>Friend requests</p>
                      {incomingRequests.map((req) => {
                        const p = requestProfiles[req.fromUid] || {};
                        return (
                          <div key={req.id} style={styles.friendReqRow}>
                            <div style={styles.friendReqAvatar}>
                              {(p.name || "?")[0].toUpperCase()}
                            </div>
                            <span style={styles.friendReqName}>{p.name || "Unknown"}</span>
                            <div style={styles.friendReqBtns}>
                              <button onClick={() => handleDecline(req.id)} style={styles.declineBtn}>Decline</button>
                              <button onClick={() => handleAccept(req.id, req.fromUid)} style={styles.acceptBtn}>Accept</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Find by code */}
                  <p style={styles.panelSubLabel}>Add by player code</p>
                  <div style={styles.codeSearchRow}>
                    <input
                      value={findCodeInput}
                      onChange={(e) => {
                        setFindCodeInput(e.target.value.toUpperCase().slice(0, 6));
                        setFindCodeError("");
                        setFindCodeResult(null);
                      }}
                      style={{ ...styles.input, flex: 1, fontFamily: "monospace", letterSpacing: "2px" }}
                      placeholder="ABC123"
                      maxLength={6}
                    />
                    <button onClick={handleFindByCode} disabled={findCodeLoading} style={styles.searchBtn}>
                      {findCodeLoading ? "..." : "Find"}
                    </button>
                  </div>
                  {findCodeError && <p style={styles.errorText}>{findCodeError}</p>}
                  {findCodeResult && (
                    <div style={styles.findResult}>
                      <div style={styles.findResultAvatar}>
                        {(findCodeResult.name || "?")[0].toUpperCase()}
                      </div>
                      <span style={styles.findResultName}>{findCodeResult.name}</span>
                      <button
                        onClick={() => onViewProfile && onViewProfile(findCodeResult.uid)}
                        style={styles.viewProfileBtn}
                      >
                        View profile
                      </button>
                    </div>
                  )}

                  {/* Current friends list */}
                  {friendProfiles.length > 0 && (
                    <div style={{ marginTop: "16px" }}>
                      <p style={styles.panelSubLabel}>Your friends ({friendProfiles.length})</p>
                      {friendProfiles.map((f) => (
                        <button
                          key={f.uid}
                          style={styles.friendRow}
                          onClick={() => onViewProfile && onViewProfile(f.uid)}
                        >
                          <div style={styles.friendAvatar}>
                            {(f.name || "?")[0].toUpperCase()}
                          </div>
                          <span style={styles.friendName}>{f.name}</span>
                          <span style={styles.chevron}>›</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {incomingRequests.length === 0 && friendProfiles.length === 0 && !findCodeResult && (
                    <p style={styles.emptyFriends}>No friends yet. Share your player code: <strong style={{ fontFamily: "monospace" }}>{userData?.userCode}</strong></p>
                  )}
                </div>
              )}

              {/* Activity panel */}
              {item.key === "activity" && activePanel === "activity" && (
                <div style={styles.panel}>
                  {appNotifs.length === 0 ? (
                    <p style={styles.panelHint}>No new notifications.</p>
                  ) : (
                    appNotifs.map((notif) => (
                      <div key={notif.id} style={styles.notifItem}>
                        <div style={styles.notifDot} />
                        <p style={styles.notifText}>
                          {notif.type === "friend_posted_game" && (
                            <><strong>{notif.fromName}</strong> posted a game: {notif.gameName}</>
                          )}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Notifications settings panel */}
              {item.key === "notifications" && activePanel === "notifications" && (
                <div style={styles.panel}>
                  <div style={styles.settingRow}>
                    <div>
                      <p style={styles.settingTitle}>Push notifications</p>
                      <p style={styles.settingSubtitle}>{notifStatusLabel}</p>
                    </div>
                    {notifPermission === "default" && (
                      <button onClick={handleRequestNotifs} style={styles.smallBtn}>Enable</button>
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
                      Notifications are blocked. Update your browser settings for this site.
                    </p>
                  )}
                </div>
              )}

              {/* Privacy panel */}
              {item.key === "privacy" && activePanel === "privacy" && (
                <div style={styles.panel}>
                  <div style={styles.settingRow}>
                    <div>
                      <p style={styles.settingTitle}>Public profile</p>
                      <p style={styles.settingSubtitle}>
                        {profilePublic ? "Other players can see your profile" : "Your profile is hidden from others"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleTogglePrivacy(!profilePublic)}
                      disabled={savingPrivacy}
                      style={{ ...styles.toggle, background: profilePublic ? "#1D9E75" : "#C9C6BC" }}
                    >
                      <div style={{ ...styles.toggleKnob, transform: profilePublic ? "translateX(20px)" : "translateX(2px)" }} />
                    </button>
                  </div>
                </div>
              )}

              {/* Help panel */}
              {item.key === "help" && activePanel === "help" && (
                <div style={styles.panel}>
                  {FAQ.map((faq, fi) => (
                    <div key={fi} style={{ borderBottom: fi < FAQ.length - 1 ? "1px solid #E0DDD5" : "none" }}>
                      <button onClick={() => setOpenFaq(openFaq === fi ? null : fi)} style={styles.faqQuestion}>
                        <span style={styles.faqLabel}>{faq.q}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A7A72" strokeWidth="2"
                          style={{ flexShrink: 0, transform: openFaq === fi ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }}>
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                      {openFaq === fi && <p style={styles.faqAnswer}>{faq.a}</p>}
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
  header: { padding: "16px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  wordmark: { fontSize: "24px", fontWeight: "700", letterSpacing: "-0.5px", color: "#085041" },
  notifBubble: {
    background: "#E24B4A", color: "white", borderRadius: "20px",
    fontSize: "12px", fontWeight: "700", padding: "2px 8px", minWidth: "20px", textAlign: "center",
  },
  content: { flex: 1, overflowY: "auto", padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: "16px" },
  profileCard: {
    background: "white", borderRadius: "16px", padding: "24px 20px",
    border: "1px solid #E0DDD5", textAlign: "center",
    display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
  },
  avatar: {
    width: "80px", height: "80px", borderRadius: "50%", background: "#1D9E75",
    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px",
  },
  avatarImg: { width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", margin: "0 auto 8px", display: "block" },
  avatarText: { fontSize: "28px", fontWeight: "700", color: "white" },
  name: { fontSize: "20px", fontWeight: "700", color: "#2C2C2A", marginBottom: "2px" },
  email: { fontSize: "14px", color: "#7A7A72" },
  codeWrap: {
    display: "flex", alignItems: "center", gap: "8px",
    background: "#F1EFE8", borderRadius: "8px", padding: "6px 12px", marginTop: "4px",
  },
  codeLabel: { fontSize: "12px", color: "#7A7A72", fontWeight: "500" },
  code: { fontSize: "16px", fontWeight: "700", color: "#085041", letterSpacing: "2px", fontFamily: "monospace" },
  noShowBadge: {
    padding: "4px 10px", borderRadius: "12px", background: "#FCEBEB",
    color: "#A32D2D", fontSize: "12px", fontWeight: "600",
  },
  statsRow: {
    display: "flex", justifyContent: "space-around", background: "white",
    borderRadius: "16px", padding: "20px 0", border: "1px solid #E0DDD5",
  },
  stat: { textAlign: "center" },
  statValue: { fontSize: "24px", fontWeight: "700", color: "#2C2C2A" },
  statLabel: { fontSize: "12px", color: "#7A7A72", fontWeight: "500" },
  section: { background: "white", borderRadius: "16px", padding: "0 16px", border: "1px solid #E0DDD5" },
  menuItem: {
    width: "100%", display: "flex", alignItems: "center", gap: "12px",
    padding: "16px 0", background: "none", border: "none", cursor: "pointer",
  },
  menuLabel: { flex: 1, textAlign: "left", fontSize: "15px", fontWeight: "500" },
  menuBadge: {
    background: "#E24B4A", color: "white", borderRadius: "20px",
    fontSize: "11px", fontWeight: "700", padding: "2px 7px", minWidth: "18px", textAlign: "center",
  },

  // Panel shared
  panel: { paddingBottom: "16px", borderBottom: "1px solid #E0DDD5" },
  panelLabel: {
    fontSize: "13px", fontWeight: "600", color: "#7A7A72",
    marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em",
  },
  panelSubLabel: {
    fontSize: "12px", fontWeight: "600", color: "#7A7A72",
    marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.04em",
  },
  panelHint: { fontSize: "13px", color: "#7A7A72", marginTop: "10px", lineHeight: "1.5" },
  panelRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" },
  charCount: { fontSize: "13px", color: "#7A7A72" },
  input: {
    width: "100%", padding: "10px 12px", borderRadius: "10px",
    border: "1px solid #D0CEC6", fontSize: "15px", color: "#2C2C2A",
    background: "#F8F7F3", boxSizing: "border-box", outline: "none",
  },
  errorText: { fontSize: "13px", color: "#D63D3D", marginTop: "6px" },
  saveBtn: {
    padding: "8px 20px", borderRadius: "20px", background: "#085041",
    color: "white", border: "none", fontSize: "14px", fontWeight: "600", cursor: "pointer",
  },
  settingRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" },
  settingTitle: { fontSize: "15px", fontWeight: "500", color: "#2C2C2A" },
  settingSubtitle: { fontSize: "13px", color: "#7A7A72", marginTop: "2px" },
  smallBtn: {
    padding: "7px 16px", borderRadius: "20px", background: "#085041",
    color: "white", border: "none", fontSize: "13px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap",
  },
  badge: { padding: "4px 10px", borderRadius: "20px", background: "#e6f7f2", color: "#085041", fontSize: "13px", fontWeight: "600" },
  toggle: {
    width: "44px", height: "26px", borderRadius: "13px", border: "none",
    cursor: "pointer", position: "relative", transition: "background 0.2s ease", flexShrink: 0, padding: 0,
  },
  toggleKnob: {
    position: "absolute", top: "3px", width: "20px", height: "20px",
    borderRadius: "50%", background: "white", transition: "transform 0.2s ease",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  },
  faqQuestion: {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: "8px", padding: "13px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left",
  },
  faqLabel: { fontSize: "14px", fontWeight: "500", color: "#2C2C2A", lineHeight: "1.4" },
  faqAnswer: { fontSize: "14px", color: "#7A7A72", lineHeight: "1.6", paddingBottom: "12px" },

  // Friends
  friendReqRow: {
    display: "flex", alignItems: "center", gap: "10px",
    marginBottom: "10px", padding: "10px", background: "#F8F7F3", borderRadius: "10px",
  },
  friendReqAvatar: {
    width: "32px", height: "32px", borderRadius: "50%", background: "#1D9E75",
    color: "white", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "13px", fontWeight: "600", flexShrink: 0,
  },
  friendReqName: { flex: 1, fontSize: "14px", fontWeight: "500", color: "#2C2C2A" },
  friendReqBtns: { display: "flex", gap: "6px" },
  declineBtn: {
    padding: "6px 10px", borderRadius: "8px", border: "1px solid #E0DDD5",
    background: "white", color: "#555550", fontSize: "12px", fontWeight: "600", cursor: "pointer",
  },
  acceptBtn: {
    padding: "6px 10px", borderRadius: "8px", border: "none",
    background: "#1D9E75", color: "white", fontSize: "12px", fontWeight: "600", cursor: "pointer",
  },
  codeSearchRow: { display: "flex", gap: "8px", marginBottom: "8px" },
  searchBtn: {
    padding: "10px 16px", borderRadius: "10px", border: "none",
    background: "#085041", color: "white", fontSize: "14px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap",
  },
  findResult: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "12px", background: "#E1F5EE", borderRadius: "10px", marginTop: "8px",
  },
  findResultAvatar: {
    width: "32px", height: "32px", borderRadius: "50%", background: "#1D9E75",
    color: "white", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "13px", fontWeight: "600",
  },
  findResultName: { flex: 1, fontSize: "14px", fontWeight: "600", color: "#085041" },
  viewProfileBtn: {
    padding: "6px 12px", borderRadius: "8px", border: "none",
    background: "#085041", color: "white", fontSize: "12px", fontWeight: "600", cursor: "pointer",
  },
  friendRow: {
    display: "flex", alignItems: "center", gap: "10px",
    width: "100%", padding: "10px 0", background: "none", border: "none",
    borderBottom: "1px solid #F1EFE8", cursor: "pointer",
  },
  friendAvatar: {
    width: "32px", height: "32px", borderRadius: "50%", background: "#E0DDD5",
    color: "#555550", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "13px", fontWeight: "600",
  },
  friendName: { flex: 1, fontSize: "14px", fontWeight: "500", color: "#2C2C2A", textAlign: "left" },
  chevron: { fontSize: "18px", color: "#C9C6BC" },
  emptyFriends: { fontSize: "13px", color: "#7A7A72", lineHeight: "1.6", textAlign: "center" },
  notifItem: {
    display: "flex", alignItems: "flex-start", gap: "10px",
    padding: "10px 0", borderBottom: "1px solid #F1EFE8",
  },
  notifDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#1D9E75", marginTop: "4px", flexShrink: 0 },
  notifText: { fontSize: "14px", color: "#2C2C2A", lineHeight: "1.5" },
};