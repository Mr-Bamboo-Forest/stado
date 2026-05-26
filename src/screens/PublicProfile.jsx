import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
} from "../utils/social";
import { NoShowBadge } from "../components/NoShowBadge";

const POSITION_LABELS = {
  goalkeeper: "Goalkeeper",
  defender: "Defender",
  midfielder: "Midfielder",
  winger: "Winger",
  striker: "Striker",
  GK: "GK", CB: "CB", LB: "LB", RB: "RB",
  CDM: "CDM", CM: "CM", CAM: "CAM",
  LW: "LW", RW: "RW", ST: "ST",
};

export default function PublicProfile({ userId, onBack }) {
  const auth = getAuth();
  const me = auth.currentUser;
  const isOwnProfile = me?.uid === userId;

  const [profile, setProfile] = useState(null);
  const [friendStatus, setFriendStatus] = useState(null); // null | "friends" | "pending_sent" | "pending_received"
  const [pendingRequestId, setPendingRequestId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    const snap = await getDoc(doc(db, "users", userId));
    if (!snap.exists()) { setLoading(false); return; }
    setProfile({ uid: userId, ...snap.data() });

    if (!isOwnProfile && me) {
      await loadFriendStatus(snap.data());
    }
    setLoading(false);
  };

  const loadFriendStatus = async (profileData) => {
    const mySnap = await getDoc(doc(db, "users", me.uid));
    const myFriends = mySnap.data()?.friendUids || [];
    if (myFriends.includes(userId)) {
      setFriendStatus("friends");
      return;
    }

    // Check pending requests
    const q1 = query(
      collection(db, "friendRequests"),
      where("fromUid", "==", me.uid),
      where("toUid", "==", userId),
      where("status", "==", "pending")
    );
    const q2 = query(
      collection(db, "friendRequests"),
      where("fromUid", "==", userId),
      where("toUid", "==", me.uid),
      where("status", "==", "pending")
    );
    const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    if (!s1.empty) {
      setFriendStatus("pending_sent");
      setPendingRequestId(s1.docs[0].id);
    } else if (!s2.empty) {
      setFriendStatus("pending_received");
      setPendingRequestId(s2.docs[0].id);
    } else {
      setFriendStatus(null);
    }
  };

  const handleAddFriend = async () => {
    setActionLoading(true);
    const result = await sendFriendRequest(me.uid, userId);
    if (!result.error) setFriendStatus("pending_sent");
    setActionLoading(false);
  };

  const handleAccept = async () => {
    setActionLoading(true);
    await acceptFriendRequest(pendingRequestId, userId, me.uid);
    setFriendStatus("friends");
    setActionLoading(false);
  };

  const handleDecline = async () => {
    setActionLoading(true);
    await declineFriendRequest(pendingRequestId);
    setFriendStatus(null);
    setPendingRequestId(null);
    setActionLoading(false);
  };

  const handleCancelRequest = async () => {
    setActionLoading(true);
    await declineFriendRequest(pendingRequestId);
    setFriendStatus(null);
    setPendingRequestId(null);
    setActionLoading(false);
  };

  const handleRemoveFriend = async () => {
    if (!window.confirm(`Remove ${profile?.name} as a friend?`)) return;
    setActionLoading(true);
    await removeFriend(me.uid, userId);
    setFriendStatus(null);
    setActionLoading(false);
  };

  const initials = profile?.name
    ? profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const noShowFlagged = (profile?.noShowRate || 0) >= 10;

  if (loading) {
    return (
      <div style={styles.screen}>
        <header style={styles.header}>
          <button style={styles.backBtn} onClick={onBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2C2C2A" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span style={styles.headerTitle}>Profile</span>
          <div style={{ width: 40 }} />
        </header>
        <div style={styles.loadingWrap}>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={styles.screen}>
        <header style={styles.header}>
          <button style={styles.backBtn} onClick={onBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2C2C2A" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span style={styles.headerTitle}>Profile</span>
          <div style={{ width: 40 }} />
        </header>
        <div style={styles.loadingWrap}>
          <p style={styles.loadingText}>User not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2C2C2A" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span style={styles.headerTitle}>
          {isOwnProfile ? "Your profile" : profile.name}
        </span>
        <div style={{ width: 40 }} />
      </header>

      <div style={styles.content}>
        {/* Avatar + name */}
        <div style={styles.card}>
          {profile.photoURL ? (
            <img src={profile.photoURL} alt="avatar" style={styles.avatarImg} />
          ) : (
            <div style={styles.avatar}>
              <span style={styles.avatarText}>{initials}</span>
            </div>
          )}
          <h2 style={styles.name}>{profile.name || "Player"}</h2>
          {profile.email && isOwnProfile && (
            <p style={styles.email}>{profile.email}</p>
          )}
          {profile.userCode && (
            <div style={styles.codeWrap}>
              <span style={styles.codeLabel}>Player code</span>
              <span style={styles.code}>{profile.userCode}</span>
            </div>
          )}
          {noShowFlagged && <NoShowBadge rate={profile.noShowRate} />}
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={styles.stat}>
            <p style={styles.statValue}>{profile.gamesAttended ?? 0}</p>
            <p style={styles.statLabel}>Games</p>
          </div>
          <div style={styles.stat}>
            <p style={styles.statValue}>{profile.gamesHosted ?? 0}</p>
            <p style={styles.statLabel}>Hosted</p>
          </div>
          <div style={styles.stat}>
            <p style={styles.statValue}>
              {(profile.friendUids || []).length}
            </p>
            <p style={styles.statLabel}>Friends</p>
          </div>
          <div style={styles.stat}>
            <p
              style={{
                ...styles.statValue,
                color: noShowFlagged ? "#E24B4A" : "#2C2C2A",
              }}
            >
              {profile.noShowRate ?? 0}%
            </p>
            <p style={styles.statLabel}>No-show</p>
          </div>
        </div>

        {/* Positions */}
        {(profile.preferredPositions?.length > 0 ||
          profile.positions?.length > 0) && (
          <div style={styles.section}>
            <p style={styles.sectionLabel}>Positions</p>
            <div style={styles.positionWrap}>
              {(profile.preferredPositions || profile.positions || []).map(
                (pos) => (
                  <span key={pos} style={styles.positionChip}>
                    {POSITION_LABELS[pos] || pos}
                  </span>
                )
              )}
            </div>
          </div>
        )}

        {/* Friend actions (only for other users) */}
        {!isOwnProfile && (
          <div style={styles.friendSection}>
            {friendStatus === null && (
              <button
                onClick={handleAddFriend}
                disabled={actionLoading}
                style={styles.addFriendBtn}
              >
                {actionLoading ? "Sending..." : "Add friend"}
              </button>
            )}
            {friendStatus === "pending_sent" && (
              <div style={styles.pendingRow}>
                <span style={styles.pendingLabel}>Friend request sent</span>
                <button
                  onClick={handleCancelRequest}
                  disabled={actionLoading}
                  style={styles.secondaryBtn}
                >
                  Cancel
                </button>
              </div>
            )}
            {friendStatus === "pending_received" && (
              <div style={styles.pendingRow}>
                <span style={styles.pendingLabel}>
                  {profile.name} wants to be friends
                </span>
                <div style={styles.acceptRow}>
                  <button
                    onClick={handleDecline}
                    disabled={actionLoading}
                    style={styles.secondaryBtn}
                  >
                    Decline
                  </button>
                  <button
                    onClick={handleAccept}
                    disabled={actionLoading}
                    style={styles.acceptBtn}
                  >
                    {actionLoading ? "..." : "Accept"}
                  </button>
                </div>
              </div>
            )}
            {friendStatus === "friends" && (
              <div style={styles.friendsRow}>
                <span style={styles.friendsLabel}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#085041" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Friends
                </span>
                <button
                  onClick={handleRemoveFriend}
                  disabled={actionLoading}
                  style={styles.removeBtn}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  screen: { flex: 1, display: "flex", flexDirection: "column", background: "#F1EFE8" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 16px", background: "white", borderBottom: "1px solid #E0DDD5", flexShrink: 0,
  },
  backBtn: {
    width: "40px", height: "40px", display: "flex", alignItems: "center",
    justifyContent: "center", borderRadius: "12px", background: "none", border: "none", cursor: "pointer",
  },
  headerTitle: { fontSize: "16px", fontWeight: "600", color: "#2C2C2A" },
  content: {
    flex: 1, overflowY: "auto", padding: "16px",
    display: "flex", flexDirection: "column", gap: "12px",
  },
  loadingWrap: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: "15px", color: "#7A7A72" },
  card: {
    background: "white", borderRadius: "16px", padding: "24px 20px",
    border: "1px solid #E0DDD5", textAlign: "center",
    display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
  },
  avatar: {
    width: "80px", height: "80px", borderRadius: "50%", background: "#1D9E75",
    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px",
  },
  avatarImg: { width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", marginBottom: "4px" },
  avatarText: { fontSize: "28px", fontWeight: "700", color: "white" },
  name: { fontSize: "20px", fontWeight: "700", color: "#2C2C2A" },
  email: { fontSize: "14px", color: "#7A7A72" },
  codeWrap: {
    display: "flex", alignItems: "center", gap: "8px",
    background: "#F1EFE8", borderRadius: "8px", padding: "6px 12px", marginTop: "4px",
  },
  codeLabel: { fontSize: "12px", color: "#7A7A72", fontWeight: "500" },
  code: { fontSize: "16px", fontWeight: "700", color: "#085041", letterSpacing: "2px", fontFamily: "monospace" },
  statsRow: {
    display: "flex", justifyContent: "space-around", background: "white",
    borderRadius: "16px", padding: "20px 0", border: "1px solid #E0DDD5",
  },
  stat: { textAlign: "center" },
  statValue: { fontSize: "24px", fontWeight: "700", color: "#2C2C2A" },
  statLabel: { fontSize: "12px", color: "#7A7A72", fontWeight: "500" },
  section: {
    background: "white", borderRadius: "16px", padding: "16px 20px", border: "1px solid #E0DDD5",
  },
  sectionLabel: {
    fontSize: "13px", fontWeight: "600", color: "#7A7A72",
    textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "12px",
  },
  positionWrap: { display: "flex", flexWrap: "wrap", gap: "8px" },
  positionChip: {
    padding: "6px 12px", borderRadius: "20px", background: "#E1F5EE",
    color: "#085041", fontSize: "13px", fontWeight: "600",
  },
  friendSection: {
    background: "white", borderRadius: "16px", padding: "16px 20px", border: "1px solid #E0DDD5",
  },
  addFriendBtn: {
    width: "100%", padding: "13px 0", borderRadius: "12px", border: "none",
    background: "#1D9E75", color: "white", fontSize: "15px", fontWeight: "600", cursor: "pointer",
  },
  pendingRow: {
    display: "flex", flexDirection: "column", gap: "12px", alignItems: "center",
  },
  pendingLabel: { fontSize: "14px", color: "#555550", textAlign: "center" },
  acceptRow: { display: "flex", gap: "8px", width: "100%" },
  acceptBtn: {
    flex: 2, padding: "11px 0", borderRadius: "10px", border: "none",
    background: "#1D9E75", color: "white", fontSize: "14px", fontWeight: "600", cursor: "pointer",
  },
  secondaryBtn: {
    flex: 1, padding: "11px 0", borderRadius: "10px", border: "1px solid #E0DDD5",
    background: "white", color: "#555550", fontSize: "14px", fontWeight: "600", cursor: "pointer",
  },
  friendsRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  friendsLabel: {
    display: "flex", alignItems: "center", gap: "6px",
    fontSize: "14px", fontWeight: "600", color: "#085041",
  },
  removeBtn: {
    padding: "8px 14px", borderRadius: "8px", border: "1px solid #E0DDD5",
    background: "white", color: "#D63D3D", fontSize: "13px", fontWeight: "600", cursor: "pointer",
  },
};