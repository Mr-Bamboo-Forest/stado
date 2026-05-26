import React, { useState, useEffect } from "react";
import Discover from "./screens/Discover";
import GameDetail from "./screens/GameDetail";
import Onboarding from "./screens/Onboarding";
import PostGame from "./screens/PostGame";
import Profile from "./screens/Profile";
import SignIn from "./screens/SignIn";
import { auth, isConfigured, getMockAuthUser } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState("discover"); // discover, post, profile, detail
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for onboarding completion
    const onboardedValue = localStorage.getItem("stado_onboarded");
    if (onboardedValue === "true") {
      setIsOnboarded(true);
    }

    if (isConfigured) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          // Normalise firebase user
          setCurrentUser({
            uid: user.uid,
            displayName: user.displayName || localStorage.getItem("temp_display_name") || "Player",
            email: user.email,
            photoURL: user.photoURL || null,
            tier: localStorage.getItem(`stado_tier_${user.uid}`) || "Free",
            completedGames: 0,
            noShows: 0
          });
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // Mock Auth management
      const mockUser = getMockAuthUser();
      if (mockUser) {
        setCurrentUser(mockUser);
      }
      setLoading(false);
    }
  }, []);

  const handleOnboardingComplete = (userData) => {
    localStorage.setItem("stado_onboarded", "true");
    setIsOnboarded(true);
    if (userData && !currentUser) {
      // Temporary cache preferences
      localStorage.setItem("temp_user_preferences", JSON.stringify(userData));
    }
  };

  const handleSignOut = () => {
    if (isConfigured) {
      auth.signOut();
    } else {
      localStorage.removeItem("stado_current_user");
      setCurrentUser(null);
    }
    setCurrentScreen("discover");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F1EFE8] text-[#2C2C2A]">
        <div className="text-center font-bold text-lg animate-pulse tracking-wide">stado</div>
      </div>
    );
  }

  // 1. Force Onboarding if first time open
  if (!isOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // 2. Auth Guard
  if (!currentUser) {
    return (
      <SignIn 
        onAuthSuccess={(user) => setCurrentUser(user)} 
        onBackToDiscover={() => setIsOnboarded(false)} 
      />
    );
  }

  // Navigation router helper
  const renderScreen = () => {
    switch (currentScreen) {
      case "discover":
        return (
          <Discover 
            currentUser={currentUser}
            onViewGame={(gameId) => {
              setSelectedGameId(gameId);
              setCurrentScreen("detail");
            }} 
          />
        );
      case "detail":
        return (
          <GameDetail 
            gameId={selectedGameId} 
            currentUser={currentUser}
            onBack={() => setCurrentScreen("discover")} 
          />
        );
      case "post":
        return (
          <PostGame 
            currentUser={currentUser}
            onSuccess={() => setCurrentScreen("discover")} 
          />
        );
      case "profile":
        return (
          <Profile 
            currentUser={currentUser} 
            onUpdateUser={(updated) => setCurrentUser(updated)}
            onSignOut={handleSignOut} 
          />
        );
      default:
        return <Discover onViewGame={(gameId) => { setSelectedGameId(gameId); setCurrentScreen("detail"); }} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex justify-center items-start overflow-x-hidden">
      {/* Mobile-first constraints frame */}
      <div className="w-full max-w-md min-h-screen bg-[#F1EFE8] text-[#2C2C2A] flex flex-col relative pb-20 shadow-2xl">
        
        {/* Main Application Body */}
        <main className="flex-1 w-full px-5 pt-6">
          {renderScreen()}
        </main>

        {/* Global Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#F1EFE8] border-t border-gray-300 h-16 flex justify-around items-center z-50">
          <button 
            onClick={() => setCurrentScreen("discover")}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              currentScreen === "discover" || currentScreen === "detail" ? "text-[#1D9E75]" : "text-[#2C2C2A]"
            }`}
          >
            <span className="text-xs font-bold tracking-wider">DISCOVER</span>
          </button>
          
          <button 
            onClick={() => setCurrentScreen("post")}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              currentScreen === "post" ? "text-[#1D9E75]" : "text-[#2C2C2A]"
            }`}
          >
            <span className="text-xs font-bold tracking-wider">POST GAME</span>
          </button>
          
          <button 
            onClick={() => setCurrentScreen("profile")}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              currentScreen === "profile" ? "text-[#1D9E75]" : "text-[#2C2C2A]"
            }`}
          >
            <span className="text-xs font-bold tracking-wider">PROFILE</span>
          </button>
        </nav>
      </div>
    </div>
  );
}