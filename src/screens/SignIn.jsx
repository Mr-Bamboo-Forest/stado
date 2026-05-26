import React, { useState } from "react";
import { auth, isConfigured, setMockAuthUser } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function SignIn({ onAuthSuccess, onBackToDiscover }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp && !displayName.trim()) {
      alert("Please enter a username.");
      setLoading(false);
      return;
    }

    if (isConfigured) {
      try {
        if (isSignUp) {
          // Register account
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;

          // Cache temporary display name in local state to prevent overwrite
          localStorage.setItem("temp_display_name", displayName);

          // Update Firebase profile info
          await updateProfile(user, { displayName });

          // Initialize Firestore DB Profile Record
          await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            displayName,
            email,
            photoURL: "",
            tier: "Free",
            completedGames: 0,
            noShows: 0
          });

          onAuthSuccess({
            uid: user.uid,
            displayName,
            email,
            photoURL: "",
            tier: "Free",
            completedGames: 0,
            noShows: 0
          });
        } else {
          // Sign In
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          onAuthSuccess({
            uid: user.uid,
            displayName: user.displayName || "Player",
            email: user.email,
            photoURL: user.photoURL || "",
            tier: localStorage.getItem(`stado_tier_${user.uid}`) || "Free",
            completedGames: 0,
            noShows: 0
          });
        }
      } catch (err) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Mock Authentication Flow
      const mockUid = `user-${Math.floor(1000 + Math.random() * 9000)}`;
      const savedPref = JSON.parse(localStorage.getItem("temp_user_preferences") || "{}");
      
      const mockUserObj = {
        uid: mockUid,
        displayName: isSignUp ? displayName : "Player",
        email,
        photoURL: "",
        tier: "Free",
        completedGames: 2,
        noShows: 0,
        ...savedPref
      };

      setMockAuthUser(mockUserObj);
      onAuthSuccess(mockUserObj);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1EFE8] text-[#2C2C2A] flex flex-col justify-center p-6 max-w-sm mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tighter text-[#1D9E75]">stado</h1>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mt-1">
          Find your game. Show up and play.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700">Display Name</label>
            <input
              type="text"
              placeholder="e.g. Marcus F."
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-[#2C2C2A] focus:outline-none focus:border-[#1D9E75]"
              required
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-xs font-black uppercase tracking-wider text-gray-700">Email Address</label>
          <input
            type="email"
            placeholder="player@stado.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-[#2C2C2A] focus:outline-none focus:border-[#1D9E75]"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-black uppercase tracking-wider text-gray-700">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-[#2C2C2A] focus:outline-none focus:border-[#1D9E75]"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1D9E75] text-white py-4 font-bold tracking-wider rounded uppercase text-xs hover:bg-[#085041] transition-colors"
        >
          {loading ? "PROCESSING..." : isSignUp ? "CREATE ACCOUNT" : "SIGN IN"}
        </button>
      </form>

      <div className="text-center space-y-2">
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-xs font-bold text-gray-500 hover:text-[#2C2C2A] uppercase tracking-wider block mx-auto"
        >
          {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
        </button>
        
        <button
          onClick={onBackToDiscover}
          className="text-xs font-bold text-gray-400 hover:text-[#2C2C2A] uppercase tracking-wider"
        >
          ← Back to concept info
        </button>
      </div>
    </div>
  );
}