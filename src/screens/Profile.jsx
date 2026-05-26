import React, { useState, useEffect } from "react";
import { getMockGames, setMockAuthUser, isConfigured, db } from "../firebase";
import { doc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";

const AVATAR_OPTIONS = [
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=stado1",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=stado2",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=stado3",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=stado4"
];

export default function Profile({ currentUser, onUpdateUser, onSignOut }) {
  const [avatar, setAvatar] = useState(currentUser.photoURL || AVATAR_OPTIONS[0]);
  const [gamesOrganised, setGamesOrganised] = useState(0);
  const [gamesJoined, setGamesJoined] = useState(0);
  const [reliabilityRating, setReliabilityRating] = useState(100);
  const [showBillingModal, setShowBillingModal] = useState(false);

  useEffect(() => {
    fetchProfileStatistics();
  }, [currentUser]);

  const fetchProfileStatistics = async () => {
    let hostCount = 0;
    let joinedCount = 0;

    if (isConfigured) {
      try {
        const gamesCollection = collection(db, "games");
        const hostQuery = query(gamesCollection, where("hostId", "==", currentUser.uid));
        const hostSnap = await getDocs(hostQuery);
        hostCount = hostSnap.size;

        const allSnap = await getDocs(gamesCollection);
        allSnap.forEach((doc) => {
          const gameData = doc.data();
          if (gameData.joinedPlayers && gameData.joinedPlayers.includes(currentUser.uid)) {
            joinedCount++;
          }
        });
      } catch (e) {
        console.warn(e);
      }
    } else {
      // Calculate from live mock items
      const mockGames = getMockGames();
      mockGames.forEach((g) => {
        if (g.hostId === currentUser.uid) hostCount++;
        if (g.joinedPlayers.includes(currentUser.uid)) joinedCount++;
      });
    }

    setGamesOrganised(hostCount);
    setGamesJoined(joinedCount);
    
    // Compute dynamic reliability calculations base
    const deduction = (currentUser.noShows || 0) * 15;
    setReliabilityRating(Math.max(0, 100 - deduction));
  };

  const updateAvatar = async (url) => {
    setAvatar(url);
    const updatedUser = { ...currentUser, photoURL: url };
    
    if (isConfigured) {
      try {
        await updateDoc(doc(db, "users", currentUser.uid), { photoURL: url });
      } catch (e) {
        console.warn(e);
      }
    } else {
      setMockAuthUser(updatedUser);
    }
    onUpdateUser(updatedUser);
  };

  const handleTierUpgrade = (tierName) => {
    const updatedUser = { ...currentUser, tier: tierName };
    localStorage.setItem(`stado_tier_${currentUser.uid}`, tierName);
    
    if (!isConfigured) {
      setMockAuthUser(updatedUser);
    }
    onUpdateUser(updatedUser);
    setShowBillingModal(false);
    alert(`Upgraded to ${tierName} plan!`);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-[#2C2C2A]">My Profile</h2>
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-0.5 font-sans">
          Manage identity, stats, and subscriptions.
        </p>
      </div>

      {/* Identity Profile Picture Customizer */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col items-center space-y-4">
        <img
          src={avatar}
          alt="Avatar icon"
          className="w-20 h-20 rounded-full border border-gray-300 p-1"
        />
        <div className="text-center">
          <h3 className="text-lg font-black text-gray-900">{currentUser.displayName}</h3>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <span className="bg-[#E1F5EE] text-[#085041] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
              {currentUser.tier || "Free"} TIER
            </span>
            {reliabilityRating >= 90 && (
              <span className="bg-[#085041] text-white text-[10px] font-black px-2 py-0.5 rounded">
                VERIFIED RELIABLE
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Avatar Selector Carousel */}
        <div className="space-y-1.5 w-full text-center">
          <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">CHANGE AVATAR</label>
          <div className="flex justify-center gap-2">
            {AVATAR_OPTIONS.map((url, i) => (
              <button
                key={i}
                onClick={() => updateAvatar(url)}
                className={`p-1 rounded-full border ${avatar === url ? "border-[#1D9E75]" : "border-transparent"}`}
              >
                <img src={url} className="w-8 h-8 rounded-full" alt="Selectable option" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Profile Statistics Card */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <span className="text-[9px] font-black uppercase text-gray-500">PLAYED</span>
          <p className="text-lg font-black text-gray-900">{gamesJoined}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <span className="text-[9px] font-black uppercase text-gray-500">ORGANISED</span>
          <p className="text-lg font-black text-gray-900">{gamesOrganised}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <span className="text-[9px] font-black uppercase text-gray-500">RELIABILITY</span>
          <p className="text-lg font-black text-gray-900">{reliabilityRating}%</p>
        </div>
      </div>

      {/* Subscription Billing panel */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider">stado membership</h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          Unlock unlimited game organization, premium weekly templates, and visual priority pins.
        </p>
        <button
          onClick={() => setShowBillingModal(true)}
          className="w-full bg-[#1D9E75] text-white text-xs font-bold py-2.5 rounded hover:bg-[#085041] transition-colors"
        >
          MANAGE SUBSCRIPTION PLANS
        </button>
      </div>

      <button
        onClick={onSignOut}
        className="w-full bg-red-50 text-red-600 border border-red-200 py-3 rounded text-xs font-bold uppercase tracking-wider hover:bg-red-100"
      >
        Sign Out
      </button>

      {/* Subscription Modal */}
      {showBillingModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#F1EFE8] rounded-lg max-w-sm w-full p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-xs font-black uppercase text-gray-700">upgrade membership</span>
              <button onClick={() => setShowBillingModal(false)} className="text-gray-500 hover:text-black">✕</button>
            </div>

            {/* Free tier card */}
            <div className="bg-white border border-gray-200 p-3.5 rounded flex justify-between items-center">
              <div>
                <p className="text-xs font-black text-gray-900">Free Tier</p>
                <p className="text-[10px] text-gray-500">Post 5 games/month. Core match finder.</p>
              </div>
              <button 
                onClick={() => handleTierUpgrade("Free")}
                className="text-[10px] bg-gray-100 border border-gray-300 font-bold px-3 py-1.5 rounded"
              >
                Select
              </button>
            </div>

            {/* Regular Tier card */}
            <div className="bg-white border border-[#1D9E75] p-3.5 rounded flex justify-between items-center relative">
              <span className="absolute -top-2 right-2 bg-[#E1F5EE] text-[#085041] text-[8px] font-black uppercase px-1 rounded">
                Popular
              </span>
              <div>
                <p className="text-xs font-black text-gray-900">Regular Member ($4.99/mo)</p>
                <p className="text-[10px] text-gray-500">Unlimited games, recurring templates.</p>
              </div>
              <button 
                onClick={() => handleTierUpgrade("Regular")}
                className="text-[10px] bg-[#1D9E75] text-white font-bold px-3 py-1.5 rounded hover:bg-[#085041]"
              >
                Upgrade
              </button>
            </div>

            {/* Venue Partner tier card */}
            <div className="bg-white border border-gray-200 p-3.5 rounded flex justify-between items-center">
              <div>
                <p className="text-xs font-black text-gray-900">Venue Partner ($49/mo)</p>
                <p className="text-[10px] text-gray-500">Verified badge on map, monthly traffic reports.</p>
              </div>
              <button 
                onClick={() => handleTierUpgrade("Partner")}
                className="text-[10px] bg-slate-900 text-white font-bold px-3 py-1.5 rounded hover:bg-black"
              >
                Partner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}