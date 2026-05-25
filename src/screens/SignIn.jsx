import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";

const provider = new GoogleAuthProvider();

export default function SignIn({ onSuccess }) {
  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
      onSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={styles.screen}>
      <div style={styles.content}>
        <span style={styles.wordmark}>stado</span>
        <p style={styles.tagline}>Find your game. Show up and play.</p>
        <button style={styles.btn} onClick={handleGoogle}>
          Continue with Google
        </button>
      </div>
    </div>
  );
}

const styles = {
  screen: { flex: 1, display: "flex", background: "#F1EFE8" },
  content: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center", gap: "16px" },
  wordmark: { fontSize: "36px", fontWeight: 700, color: "#085041", letterSpacing: "-0.5px" },
  tagline: { fontSize: "15px", color: "#888780", margin: 0 },
  btn: { marginTop: "24px", background: "#1D9E75", color: "white", border: "none", borderRadius: "12px", padding: "16px 32px", fontSize: "15px", fontWeight: 700, cursor: "pointer", width: "100%", maxWidth: "300px" },
};
