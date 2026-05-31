// src/services/gameService.js
//
// Shared Firestore actions for game join / leave.
// Import and call these from any page or component that needs them.
//
// Usage:
//   import { joinGame, leaveGame } from '../services/gameService';
//
//   await joinGame(gameId, currentUser.uid);
//   await leaveGame(gameId, currentUser.uid);

import { doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '../firebase'; // adjust path if your firebase init lives elsewhere

/**
 * Join a game.
 * Adds the user's UID to `players` and decrements `spotsRemaining` by 1.
 * The Firestore security rule validates:
 *   - user is not already in the game
 *   - the game is not full
 *   - only these two fields change
 *
 * @param {string} gameId
 * @param {string} uid
 */
export async function joinGame(gameId, uid) {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, {
    players: arrayUnion(uid),
    spotsRemaining: increment(-1),
  });
}

/**
 * Leave a game.
 * Removes the user's UID from `players` and increments `spotsRemaining` by 1.
 * The Firestore security rule validates:
 *   - user IS currently in the game
 *   - only their own UID is removed
 *   - the host cannot use this path (they should delete the game)
 *   - only these two fields change
 *
 * @param {string} gameId
 * @param {string} uid
 */
export async function leaveGame(gameId, uid) {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, {
    players: arrayRemove(uid),
    spotsRemaining: increment(1),
  });
}