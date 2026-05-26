import React, { useState, useEffect } from "react";
import { getMockGames, isConfigured, db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

// Helper function to calculate distances (Haversine formula)
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
};

export default function Discover({ currentUser, onViewGame }) {
  const [games, setGames] = useState([]);
  const [filteredGames, setFilteredGames] = useState([]);
  const [searchCode, setSearchCode] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [sortBy, setSortBy] = useState("distance"); // distance, date
  const [showPrivateOnly, setShowPrivateOnly] = useState(false);

  useEffect(() => {
    // Fetch device coordinates
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        () => {
          // Fallback to Melbourne central coordinates if permission denied
          setUserLocation({ lat: -37.8136, lng: 144.9631 });
        }
      );
    }

    fetchGames();
  }, []);

  const fetchGames = async () => {
    let rawGames = [];
    if (isConfigured) {
      try {
        const querySnapshot = await getDocs(collection(db, "games"));
        querySnapshot.forEach((doc) => {
          rawGames.push({ id: doc.id, ...doc.data() });
        });
      } catch (e) {
        console.warn("Firestore read failed, falling back to mock", e);
        rawGames = getMockGames();
      }
    } else {
      rawGames = getMockGames();
    }
    setGames(rawGames);
  };

  useEffect(() => {
    let result = [...games];

    // Compute distance calculations for each match item
    if (userLocation) {
      result = result.map((game) => ({
        ...game,
        distance: getDistanceKm(userLocation.lat, userLocation.lng, game.lat, game.lng)
      }));
    }

    // Process Search Query
    if (searchCode.trim()) {
      const q = searchCode.trim().toUpperCase();
      result = result.filter(
        (g) =>
          g.name.toUpperCase().includes(q) ||
          g.code === q ||
          g.pitchName.toUpperCase().includes(q)
      );
    } else {
      // Exclude private matches from main discover lists
      result = result.filter((g) => !g.isPrivate);
    }

    // Sorting algorithms
    if (sortBy === "distance") {
      result.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else if (sortBy === "date") {
      result.sort((a, b) => new Date(a.date + "T" + a.time) - new Date(b.date + "T" + b.time));
    }

    setFilteredGames(result);
  }, [games, searchCode, sortBy, userLocation]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[#2C2C2A]">stado</h1>
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
          Find your game. Show up and play.
        </p>
      </div>

      {/* Code Search bar & public-private filters */}
      <div className="space-y-2">
        <label className="block text-xs font-black uppercase tracking-wider text-gray-700">
          Find public pitches or private access code
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search game or enter code (e.g., STADO-8921)"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm uppercase placeholder-normal text-[#2C2C2A] focus:outline-none focus:border-[#1D9E75]"
          />
        </div>
      </div>

      {/* Sorting Tabs */}
      <div className="flex justify-between items-center border-b border-gray-300 pb-2">
        <span className="text-xs font-black uppercase tracking-wider text-gray-500">
          {filteredGames.length} MATCHES FOUND
        </span>
        <div className="flex gap-4">
          <button
            onClick={() => setSortBy("distance")}
            className={`text-xs font-bold uppercase tracking-wider ${
              sortBy === "distance" ? "text-[#1D9E75] border-b-2 border-[#1D9E75] pb-1" : "text-gray-500"
            }`}
          >
            Closest
          </button>
          <button
            onClick={() => setSortBy("date")}
            className={`text-xs font-bold uppercase tracking-wider ${
              sortBy === "date" ? "text-[#1D9E75] border-b-2 border-[#1D9E75] pb-1" : "text-gray-500"
            }`}
          >
            Soonest
          </button>
        </div>
      </div>

      {/* Games List Container */}
      <div className="space-y-3">
        {filteredGames.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="font-bold text-sm text-[#2C2C2A]">No games found matching criteria.</p>
            <p className="text-xs mt-1">Try another search or post a new match.</p>
          </div>
        ) : (
          filteredGames.map((game) => (
            <div
              key={game.id}
              onClick={() => onViewGame(game.id)}
              className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-[#1D9E75] transition-all relative"
            >
              {/* Featured priority highlight indicator */}
              {game.isPriority && (
                <span className="absolute top-3 right-3 bg-[#E1F5EE] text-[#085041] px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                  Featured
                </span>
              )}

              {/* Pitch verified badge */}
              {game.isVenueVerified && (
                <span className="absolute top-3 right-24 bg-[#085041] text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                  Verified Venue
                </span>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-lg text-[#2C2C2A] leading-tight">
                    {game.name}
                  </h3>
                  {game.isPrivate && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                      Private
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600 font-bold">
                  <div className="flex items-center gap-1.5">
                    <span>{game.distance !== null ? `${game.distance} km away` : "Coarse Location"}</span>
                    <span>•</span>
                    <span>{game.pitchName}</span>
                  </div>
                  <span className="text-[#1D9E75]">
                    {game.joinedPlayers.length} / {game.maxPlayers} Spots
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-2 text-gray-500">
                  <div>
                    {new Date(game.date).toLocaleDateString("en-AU", {
                      weekday: "short",
                      day: "numeric",
                      month: "short"
                    })}{" "}
                    at {game.time}
                  </div>
                  <span className="text-[#1D9E75] font-black uppercase tracking-wider text-[11px]">
                    VIEW DETAILS
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}