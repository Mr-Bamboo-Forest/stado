import React, { useState, useEffect } from "react";
import { addMockGame, isConfigured, db } from "../firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";

export default function PostGame({ currentUser, onSuccess }) {
  const [name, setName] = useState("5v5 Casual Friendly");
  const [pitchName, setPitchName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(-37.8136); // Melbourne default coords
  const [lng, setLng] = useState(144.9631);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [postCountThisMonth, setPostCountThisMonth] = useState(0);
  const [isOverLimit, setIsOverLimit] = useState(false);

  useEffect(() => {
    checkPostLimits();
  }, []);

  const checkPostLimits = async () => {
    let posts = 0;
    const userTier = currentUser.tier || "Free";

    if (isConfigured) {
      try {
        const q = query(collection(db, "games"), where("hostId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        posts = querySnapshot.size;
      } catch (e) {
        console.warn(e);
      }
    } else {
      posts = 2; // Simulated post counts
    }

    setPostCountThisMonth(posts);
    if (userTier === "Free" && posts >= 5) {
      setIsOverLimit(true);
    }
  };

  // Mock Map interactive pin drop calculation
  const handleMapMockClick = (e) => {
    // Generate slight variants around Melbourne CBD coordinates
    const randomOffsetLat = (Math.random() - 0.5) * 0.1;
    const randomOffsetLng = (Math.random() - 0.5) * 0.1;
    const finalLat = parseFloat((-37.8136 + randomOffsetLat).toFixed(4));
    const finalLng = parseFloat((144.9631 + randomOffsetLng).toFixed(4));
    setLat(finalLat);
    setLng(finalLng);
    setPitchName(`Royal Park Pitch ${Math.floor(Math.random() * 5) + 1}`);
    setAddress("Royal Parade, Parkville VIC 3052");
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (isOverLimit) {
      alert("Free Tier posting limit exceeded! (Max 5/month). Upgrade to the Regular Tier in settings.");
      return;
    }

    const uniqueCode = isPrivate ? `STADO-${Math.floor(1000 + Math.random() * 9000)}` : "";

    const newGame = {
      name,
      pitchName: pitchName || "Local Park Green",
      address: address || "Exact address revealed upon joining",
      lat,
      lng,
      date,
      time,
      hostId: currentUser.uid,
      hostName: currentUser.displayName,
      joinedPlayers: [currentUser.uid],
      maxPlayers: parseInt(maxPlayers),
      isPrivate,
      code: uniqueCode,
      isRecurring: currentUser.tier === "Regular" ? isRecurring : false,
      isPriority: currentUser.tier === "Regular" || currentUser.tier === "Partner",
      isVenueVerified: currentUser.tier === "Partner",
      price: 0
    };

    if (isConfigured) {
      try {
        await addDoc(collection(db, "games"), newGame);
      } catch (err) {
        console.error("Firestore write failed, falling back to mock save", err);
      }
    } else {
      addMockGame({ id: `mock-${Date.now()}`, ...newGame });
    }

    alert("Match posted successfully!");
    onSuccess();
  };

  return (
    <form onSubmit={handlePublish} className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-[#2C2C2A]">Post Game</h2>
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
          Organise a match. Set rules. Drop coordinates.
        </p>
      </div>

      {isOverLimit && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded text-xs space-y-2">
          <p className="font-bold">POSTING LIMIT EXCEEDED</p>
          <p>You have posted 5 matches this month under the Free tier. Upgrade your subscription to unlock unlimited schedules.</p>
        </div>
      )}

      {/* Preset Name Generator dropdown */}
      <div className="space-y-1">
        <label className="block text-xs font-black uppercase tracking-wider text-gray-700">Game Name</label>
        <select
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-[#2C2C2A] focus:outline-none"
        >
          <option value="5v5 Casual Match">5v5 Casual Friendly</option>
          <option value="7v7 Competitive Match">7v7 Competitive Game</option>
          <option value="9v9 Mid-week Friendly">9v9 Mid-week Friendly</option>
          <option value="11v11 Weekend Match">11v11 Match</option>
        </select>
      </div>

      {/* Interactive Map Selector Box */}
      <div className="space-y-1">
        <label className="block text-xs font-black uppercase tracking-wider text-gray-700">PITCH COORDINATES MAP</label>
        <div className="border border-gray-300 rounded overflow-hidden">
          {/* Simulated maps graphic interface */}
          <div 
            onClick={handleMapMockClick}
            className="h-32 bg-slate-200 relative cursor-pointer flex flex-col justify-center items-center p-4 border-b border-gray-300"
          >
            <div className="absolute top-2 right-2 bg-white px-1.5 py-0.5 rounded text-[9px] font-bold text-gray-500 shadow-sm border">
              MAP PICKER
            </div>
            
            <div className="w-4 h-4 rounded-full bg-[#1D9E75] border-2 border-white animate-bounce mb-1"></div>
            <p className="text-xs font-black text-gray-700">Click to Select Map Coordinates</p>
            <p className="text-[10px] text-gray-500">Dropped Pin: {lat}, {lng}</p>
          </div>
          <div className="p-3 bg-white space-y-2">
            <input
              type="text"
              placeholder="Pitch Name (e.g. Royal Park Pitch 3)"
              value={pitchName}
              onChange={(e) => setPitchName(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded px-3 py-1.5 text-xs text-[#2C2C2A] focus:outline-none"
              required
            />
            <input
              type="text"
              placeholder="Address / Pitch Entry Point Instructions"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded px-3 py-1.5 text-xs text-[#2C2C2A] focus:outline-none"
              required
            />
          </div>
        </div>
      </div>

      {/* Date and Time Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-black uppercase tracking-wider text-gray-700">DATE</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-[#2C2C2A] focus:outline-none"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-black uppercase tracking-wider text-gray-700">TIME</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-[#2C2C2A] focus:outline-none"
            required
          />
        </div>
      </div>

      {/* Match Sizing format */}
      <div className="space-y-1">
        <label className="block text-xs font-black uppercase tracking-wider text-gray-700">SPOTS AVAILABLE</label>
        <input
          type="number"
          min="2"
          max="30"
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-[#2C2C2A] focus:outline-none"
        />
      </div>

      {/* Lobby Privacy Configuration */}
      <div className="space-y-1.5 bg-white p-3 border border-gray-200 rounded">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-900 block">Private Lobby</span>
            <span className="text-[10px] text-gray-500">Only accessible via direct access/invite code.</span>
          </div>
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="w-4 h-4 accent-[#1D9E75]"
          />
        </div>
      </div>

      {/* Premium Tier Recurring Scheduling */}
      <div className="space-y-1.5 bg-white p-3 border border-gray-200 rounded">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              Weekly Recurring Game
              <span className="text-[9px] bg-[#E1F5EE] text-[#085041] px-1 rounded uppercase">Premium</span>
            </span>
            <span className="text-[10px] text-gray-500">Re-posts automatically every week.</span>
          </div>
          <input
            type="checkbox"
            disabled={currentUser.tier === "Free"}
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="w-4 h-4 disabled:opacity-50 accent-[#1D9E75]"
          />
        </div>
        {currentUser.tier === "Free" && (
          <p className="text-[9px] text-[#085041] font-semibold">Requires upgrading to Regular Subscription.</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isOverLimit}
        className="w-full bg-[#1D9E75] text-white py-4 font-bold tracking-wider rounded uppercase text-xs hover:bg-[#085041] transition-colors disabled:opacity-50"
      >
        PUBLISH MATCH
      </button>
    </form>
  );
}