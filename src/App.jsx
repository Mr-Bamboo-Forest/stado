import { useState } from "react";
import Discover from "./screens/Discover";
import PostGame from "./screens/PostGame";
import Profile from "./screens/Profile";
import GameDetail from "./screens/GameDetail";

export default function App() {
  const [screen, setScreen] = useState("discover");
  const [selectedGame, setSelectedGame] = useState(null);

  const goToGame = (game) => {
    setSelectedGame(game);
    setScreen("detail");
  };

  const goBack = () => {
    setSelectedGame(null);
    setScreen("discover");
  };

  return (
    <div style={styles.root}>
      <div style={styles.phone}>
        {screen === "discover" && <Discover onGameClick={goToGame} />}
        {screen === "detail" && <GameDetail game={selectedGame} onBack={goBack} />}
        {screen === "post" && <PostGame />}
        {screen === "profile" && <Profile />}

        {screen !== "detail" && (
          <div style={styles.nav}>
            <NavItem
              label="Discover"
              active={screen === "discover"}
              onClick={() => setScreen("discover")}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              }
            />
            <NavItem
              label="Post a Game"
              active={screen === "post"}
              onClick={() => setScreen("post")}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              }
            />
            <NavItem
              label="Profile"
              active={screen === "profile"}
              onClick={() => setScreen("profile")}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function NavItem({ label, active, onClick, icon }) {
  return (
    <div onClick={onClick} style={{ ...styles.navItem, color: active ? "#1D9E75" : "#B4B2A9" }}>
      {icon}
      <span style={styles.navLabel}>{label}</span>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#2C2C2A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  phone: {
    width: "390px",
    minHeight: "700px",
    background: "#F1EFE8",
    borderRadius: "40px",
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
  },
  nav: {
    display: "flex",
    background: "white",
    borderTop: "1px solid #E0DDD5",
    padding: "10px 0 16px",
    flexShrink: 0,
  },
  navItem: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    cursor: "pointer",
  },
  navLabel: {
    fontSize: "10px",
    fontWeight: 500,
  },
};