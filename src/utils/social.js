import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// Generate a readable 6-char user code e.g. "AB12CD"
export function generateUserCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Ensure a user has a unique userCode; call once after profile creation
export async function ensureUserCode(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data().userCode) return snap.data().userCode;

  // Generate and check uniqueness
  let code;
  let attempts = 0;
  while (attempts < 10) {
    code = generateUserCode();
    const q = query(collection(db, "users"), where("userCode", "==", code));
    const existing = await getDocs(q);
    if (existing.empty) break;
    attempts++;
  }
  await updateDoc(ref, { userCode: code });
  return code;
}

// Find a user by their userCode
export async function findUserByCode(code) {
  const q = query(
    collection(db, "users"),
    where("userCode", "==", code.toUpperCase())
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { uid: d.id, ...d.data() };
}

// Calculate no-show rate over a rolling 6-month window from archived games
export async function recalculateNoShowRate(uid) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const cutoff = Timestamp.fromDate(sixMonthsAgo);

  // Query archived games where this user was a registered player
  const q = query(
    collection(db, "archivedGames"),
    where("playerUids", "array-contains", uid),
    where("gameDate", ">=", cutoff)
  );
  const snap = await getDocs(q);

  let total = 0;
  let noShows = 0;

  snap.forEach((d) => {
    const data = d.data();
    if (data.attendance && data.attendance[uid] !== undefined) {
      total++;
      if (data.attendance[uid] === false) noShows++;
    }
  });

  const rate = total === 0 ? 0 : Math.round((noShows / total) * 100);
  await updateDoc(doc(db, "users", uid), {
    noShowRate: rate,
    noShowTotal: total,
    noShowCount: noShows,
  });
  return rate;
}

// Archive a completed game and delete from active collection
// attendance: { [uid]: true (showed) | false (no-show) }
export async function archiveGame(game, attendance) {
  const gameDate =
    game.createdAt instanceof Timestamp
      ? game.createdAt
      : Timestamp.fromDate(new Date());

  await addDoc(collection(db, "archivedGames"), {
    ...game,
    attendance,
    gameDate,
    archivedAt: serverTimestamp(),
  });

  await deleteDoc(doc(db, "games", game.id));

  // Update no-show stats for each player
  const playerUids = game.playerUids || [];
  await Promise.all(playerUids.map((uid) => recalculateNoShowRate(uid)));
}

// Send a friend request
export async function sendFriendRequest(fromUid, toUid) {
  // Check no existing request in either direction
  const q1 = query(
    collection(db, "friendRequests"),
    where("fromUid", "==", fromUid),
    where("toUid", "==", toUid)
  );
  const q2 = query(
    collection(db, "friendRequests"),
    where("fromUid", "==", toUid),
    where("toUid", "==", fromUid)
  );
  const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  if (!s1.empty || !s2.empty) return { error: "Request already exists" };

  // Check not already friends
  const fromSnap = await getDoc(doc(db, "users", fromUid));
  if (fromSnap.data()?.friendUids?.includes(toUid)) {
    return { error: "Already friends" };
  }

  await addDoc(collection(db, "friendRequests"), {
    fromUid,
    toUid,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return { success: true };
}

// Accept a friend request — adds each user to the other's friendUids
export async function acceptFriendRequest(requestId, fromUid, toUid) {
  await updateDoc(doc(db, "friendRequests", requestId), {
    status: "accepted",
  });

  const fromRef = doc(db, "users", fromUid);
  const toRef = doc(db, "users", toUid);
  const [fromSnap, toSnap] = await Promise.all([
    getDoc(fromRef),
    getDoc(toRef),
  ]);

  const fromFriends = fromSnap.data()?.friendUids || [];
  const toFriends = toSnap.data()?.friendUids || [];

  if (!fromFriends.includes(toUid)) {
    await updateDoc(fromRef, { friendUids: [...fromFriends, toUid] });
  }
  if (!toFriends.includes(fromUid)) {
    await updateDoc(toRef, { friendUids: [...toFriends, fromUid] });
  }
}

// Decline or cancel a friend request
export async function declineFriendRequest(requestId) {
  await deleteDoc(doc(db, "friendRequests", requestId));
}

// Remove a friend from both users
export async function removeFriend(myUid, theirUid) {
  const myRef = doc(db, "users", myUid);
  const theirRef = doc(db, "users", theirUid);
  const [mySnap, theirSnap] = await Promise.all([
    getDoc(myRef),
    getDoc(theirRef),
  ]);

  const myFriends = (mySnap.data()?.friendUids || []).filter(
    (u) => u !== theirUid
  );
  const theirFriends = (theirSnap.data()?.friendUids || []).filter(
    (u) => u !== myUid
  );

  await Promise.all([
    updateDoc(myRef, { friendUids: myFriends }),
    updateDoc(theirRef, { friendUids: theirFriends }),
  ]);
}

// Notify all friends when a user posts a game
export async function notifyFriendsOfGame(hostUid, hostName, gameId, gameName) {
  const hostSnap = await getDoc(doc(db, "users", hostUid));
  const friendUids = hostSnap.data()?.friendUids || [];
  if (friendUids.length === 0) return;

  const batch = friendUids.map((friendUid) =>
    addDoc(collection(db, "notifications"), {
      toUid: friendUid,
      type: "friend_posted_game",
      fromUid: hostUid,
      fromName: hostName,
      gameId,
      gameName,
      read: false,
      createdAt: serverTimestamp(),
    })
  );
  await Promise.all(batch);
}

// Check and auto-archive games past the 24h attendance window
export async function checkAndArchiveExpiredGames() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const cutoff = Timestamp.fromDate(twentyFourHoursAgo);

  const q = query(
    collection(db, "games"),
    where("completed", "==", true),
    where("completedAt", "<=", cutoff)
  );
  const snap = await getDocs(q);

  for (const d of snap.docs) {
    const game = { id: d.id, ...d.data() };
    // attendance defaults neutral for anyone not marked
    const attendance = game.attendance || {};
    await archiveGame(game, attendance);
  }

  // Also archive games where host never marked complete but game time has passed 24h
  const q2 = query(
    collection(db, "games"),
    where("completed", "==", false),
    where("createdAt", "<=", cutoff)
  );
  const snap2 = await getDocs(q2);
  for (const d of snap2.docs) {
    const game = { id: d.id, ...d.data() };
    await archiveGame(game, {});
  }
}

// Get pending friend requests for a user (received)
export async function getIncomingFriendRequests(uid) {
  const q = query(
    collection(db, "friendRequests"),
    where("toUid", "==", uid),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Get outgoing pending requests
export async function getOutgoingFriendRequests(uid) {
  const q = query(
    collection(db, "friendRequests"),
    where("fromUid", "==", uid),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Get unread notification count
export async function getUnreadNotifCount(uid) {
  const q = query(
    collection(db, "notifications"),
    where("toUid", "==", uid),
    where("read", "==", false)
  );
  const snap = await getDocs(q);
  return snap.size;
}