import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mock-auth",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mock-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mock-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "mock-sender",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "mock-app"
};

// Simple helper to check if real config is provided
const isConfigured = import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== "mock-key";

let app;
let auth;
let db;

if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.warn("Firebase failed to initialize. Falling back to Mock DB.", error);
  }
}

// Global local state fallbacks for mock operation
const mockStorage = {
  users: JSON.parse(localStorage.getItem("stado_mock_users")) || {},
  games: JSON.parse(localStorage.getItem("stado_mock_games")) || [
    {
      id: "game-1",
      name: "5v5 Casual Match",
      pitchName: "Brunswick Turf Pitch 2",
      address: "123 Albert St, Brunswick VIC 3056",
      lat: -37.7701,
      lng: 144.9614,
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
      time: "18:30",
      hostId: "host-1",
      hostName: "Marcus F.",
      joinedPlayers: ["user-123", "player-2"],
      maxPlayers: 10,
      isPrivate: false,
      code: "",
      isRecurring: false,
      isPriority: false,
      isVenueVerified: true,
      price: 0
    },
    {
      id: "game-2",
      name: "7v7 High Intensity",
      pitchName: "Princes Park South Fields",
      address: "Royal Parade, Carlton North VIC 3054",
      lat: -37.7854,
      lng: 144.9582,
      date: new Date(Date.now() + 172800000).toISOString().split('T')[0], // day after tomorrow
      time: "19:00",
      hostId: "host-2",
      hostName: "Sarah T.",
      joinedPlayers: ["player-3"],
      maxPlayers: 14,
      isPrivate: true,
      code: "STADO-8921",
      isRecurring: true,
      isPriority: true,
      isVenueVerified: false,
      price: 0
    }
  ]
};

const saveMockData = () => {
  localStorage.setItem("stado_mock_users", JSON.stringify(mockStorage.users));
  localStorage.setItem("stado_mock_games", JSON.stringify(mockStorage.games));
};

export const getMockAuthUser = () => {
  const local = localStorage.getItem("stado_current_user");
  return local ? JSON.parse(local) : null;
};

export const setMockAuthUser = (user) => {
  if (user) {
    localStorage.setItem("stado_current_user", JSON.stringify(user));
    mockStorage.users[user.uid] = user;
    saveMockData();
  } else {
    localStorage.removeItem("stado_current_user");
  }
};

export const getMockGames = () => {
  return mockStorage.games;
};

export const addMockGame = (game) => {
  mockStorage.games.push(game);
  saveMockData();
  return game;
};

export const updateMockGame = (updatedGame) => {
  mockStorage.games = mockStorage.games.map(g => g.id === updatedGame.id ? updatedGame : g);
  saveMockData();
};

export { auth, db, isConfigured };