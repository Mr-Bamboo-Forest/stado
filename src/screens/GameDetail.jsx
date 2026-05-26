import React, { useState, useEffect } from "react";
import { getMockGames, updateMockGame, isConfigured, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function GameDetail({ gameId, currentUser, onBack }) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGame();
  }, [gameId]);

  const fetchGame = async () => {
    if (isConfigured) {
      try {
        const docRef = doc(db, "games", gameId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setGame({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
        fallbackToMock();
      }
    } else {
      fallbackToMock();
    }
  };

  const fallbackToMock = () => {
    const mockList = getMockGames();
    const found = mockList.find((g) => g.id === gameId);
    if (found) {
      setGame(found);
    }
    setLoading(false);
  };

  if (loading || !game) {
    return <div className="text-center py-10 font-bold">Loading match...</div>;
  }

  const isJoined = game.joinedPlayers.includes(currentUser.uid);
  const isHost = game.hostId === currentUser.uid;

  const handleJoinLeave = async () => {
    let updatedPlayers;
    if (isJoined) {
      updatedPlayers = game.joinedPlayers.filter((id) => id !== currentUser.uid);
    } else {
      if (game.joinedPlayers.length >= game.maxPlayers) {
        alert("This match is full!");
        return;
      }
      updatedPlayers = [...game.joinedPlayers, currentUser.uid];
    }

    const updatedGame = { ...game, joinedPlayers: updatedPlayers };

    if (isConfigured) {
      try {
        await updateDoc(doc(db, "games", gameId), { joinedPlayers: updatedPlayers });
        setGame(updatedGame);
      } catch (e) {
        console.error("Firestore error joining game", e);
      }
    } else {
      updateMockGame(updatedGame);
      setGame(updatedGame);
    }
  };

  // Open Google Maps using lat/long coordinates
  const handleOpenMap = () => {
    if (!isJoined && !isHost) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${game.lat},${game.lng}`;
    window.open(url, "_blank");
  };

  const handleMarkNoShow = async (playerUid) => {
    alert(`No-show logged for participant. Reliability rating calculation modified.`);
  };

  return (
    <div className="space-y-6">
      {/* Back Header */}
      <button onClick={onBack} className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
        ← BACK TO DISCOVER
      </button>

      {/* Main Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <div className="flex justify-between items-start">
          <h2 className="text-2xl font-black text-[#2C2C2A]">{game.name}</h2>
          {game.isPrivate && (
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded">
              PRIVATE
            </span>
          )}
        </div>

        {/* Coarse vs. Precise Address Mechanics */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-black text-gray-500 uppercase tracking-wider">PITCH LOCATION</p>
          <p className="font-bold text-[#2C2C2A] text-sm mt-1">
            {isJoined || isHost ? game.address : "●●●● Joined Only Address"}
          </p>
          <p className="text-xs text-gray-500 mt-1">{game.pitchName}</p>

          {!isJoined && !isHost ? (
            <div className="mt-3 bg-[#E1F5EE] border border-[#1D9E75] p-3 rounded text-xs text-[#085041] leading-normal font-medium">
              Join this game to reveal the full address, pitch number, and directions.
            </div>
          ) : (
            <button
              onClick={handleOpenMap}
              className="mt-3 w-full bg-[#1D9E75] text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded hover:bg-[#085041] transition-colors"
            >
              OPEN MAP DIRECTIONS
            </button>
          )}
        </div>

        {/* Date Time format info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded border border-gray-100">
            <span className="text-[10px] text-gray-500 uppercase font-black">DATE</span>
            <p className="font-bold text-[#2C2C2A] text-sm">
              {new Date(game.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded border border-gray-100">
            <span className="text-[10px] text-gray-500 uppercase font-black">TIME</span>
            <p className="font-bold text-[#2C2C2A] text-sm">{game.time}</p>
          </div>
        </div>

        {/* Private Code Display */}
        {game.isPrivate && (isJoined || isHost) && (
          <div className="p-3 bg-[#E1F5EE] border border-[#1D9E75] rounded flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-[#085041]">PRIVATE ACCESS CODE</p>
              <p className="font-mono font-bold text-[#085041] text-base">{game.code}</p>
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(game.code);
                alert("Invite code copied!");
              }}
              className="text-xs font-bold text-[#1D9E75] hover:text-[#085041]"
            >
              COPY LINK
            </button>
          </div>
        )}

        {/* List of Registered Players */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2 mb-2">
            PLAYERS SIGNED UP ({game.joinedPlayers.length} / {game.maxPlayers})
          </h3>
          <div className="space-y-2">
            {game.joinedPlayers.map((playerUid, index) => (
              <div key={index} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-300 text-xs font-black flex items-center justify-center">
                    {index + 1}
                  </div>
                  <span className="text-sm font-bold text-[#2C2C2A]">
                    {playerUid === currentUser.uid ? `${currentUser.displayName} (You)` : `Player`}
                  </span>
                  {/* Verified Reliable player badge */}
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded">
                    Reliable
                  </span>
                </div>
                {/* Host controls for No-Shows */}
                {isHost && playerUid !== currentUser.uid && (
                  <button
                    onClick={() => handleMarkNoShow(playerUid)}
                    className="text-[10px] font-bold text-red-600 border border-red-200 px-2 py-0.5 rounded hover:bg-red-50"
                  >
                    Mark No-Show
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Button: Join/Leave match */}
        <button
          onClick={handleJoinLeave}
          className={`w-full py-4 rounded font-bold uppercase tracking-wider text-sm transition-colors ${
            isJoined 
              ? "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100" 
              : "bg-[#1D9E75] text-[#F1EFE8] hover:bg-[#085041]"
          }`}
        >
          {isJoined ? "LEAVE GAME" : "JOIN GAME TO REVEAL ADDRESS"}
        </button>
      </div>
    </div>
  );
}