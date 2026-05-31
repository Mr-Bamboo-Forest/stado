// src/components/LeaveGameButton.jsx
//
// Drop-in "Leave game" button for use inside GameDetailPage (or wherever
// the game detail is rendered). Handles:
//   - showing only when the current user is a non-host player in the game
//   - a confirmation dialog before committing
//   - loading state while the Firestore write is in flight
//   - error display if the write fails
//   - automatic navigation away after a successful leave
//
// Props:
//   game        {object}   — Firestore game doc (id, hostUid, players, ...)
//   currentUser {object}   — Firebase Auth user object ({ uid, ... })
//   onLeft      {function} — optional callback after a successful leave
//                            (e.g. navigate back to the game list)
//
// Example usage inside GameDetailPage.jsx:
//
//   import LeaveGameButton from '../components/LeaveGameButton';
//
//   // inside your JSX, alongside the existing Join button:
//   <LeaveGameButton
//     game={game}
//     currentUser={currentUser}
//     onLeft={() => navigate('/games')}
//   />

import { useState } from 'react';
import { leaveGame } from '../services/gameService';

export default function LeaveGameButton({ game, currentUser, onLeft }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Only render when the current user is a non-host player in this game.
  if (!currentUser || !game) return null;
  const isHost = game.hostUid === currentUser.uid;
  const isPlayer = Array.isArray(game.players) && game.players.includes(currentUser.uid);
  if (isHost || !isPlayer) return null;

  async function handleConfirmedLeave() {
    setLoading(true);
    setError(null);
    try {
      await leaveGame(game.id, currentUser.uid);
      setConfirming(false);
      if (onLeft) onLeft();
    } catch (err) {
      console.error('Failed to leave game:', err);
      setError('Could not leave the game. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Confirmation dialog ────────────────────────────────────────────────────
  if (confirming) {
    return (
      <div className="leave-confirm">
        <p className="leave-confirm__question">
          Are you sure you want to leave this game?
        </p>
        {error && <p className="leave-confirm__error">{error}</p>}
        <div className="leave-confirm__actions">
          <button
            className="btn btn--danger"
            onClick={handleConfirmedLeave}
            disabled={loading}
          >
            {loading ? 'Leaving…' : 'Yes, leave'}
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => { setConfirming(false); setError(null); }}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Default state: single "Leave game" button ──────────────────────────────
  return (
    <button
      className="btn btn--leave"
      onClick={() => setConfirming(true)}
    >
      Leave game
    </button>
  );
}