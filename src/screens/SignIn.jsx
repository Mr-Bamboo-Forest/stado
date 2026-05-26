import { useState } from "react";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
} from "firebase/auth";
import { auth } from "../firebase";

const provider = new GoogleAuthProvider();

export default function SignIn({ onSuccess }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, provider);
      onSuccess();
    } catch (err) {
      console.error(err);
      setError("Google sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Try signing in instead.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found with this email. Try creating one.");
      } else if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Incorrect password. Please try again.");
      } else {
        setError("Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    try {
      setLoading(true);
      await signInAnonymously(auth);
      onSuccess();
    } catch (err) {
      console.error(err);
      setError("Failed to continue as guest. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError("");
  };

  return (
    <div style={styles.screen}>
      <div style={styles.content}>
        <span style={styles.wordmark}>stado</span>
        <p style={styles.tagline}>Find your game. Show up and play.</p>

        <button
          style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
          onClick={handleGoogle}
          disabled={loading}
        >
          <svg style={styles.googleIcon} width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.23v2.84C4.13 20.67 7.78 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.23C1.43 8.55 1 10.22 1 12s.43 3.45 1.23 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.78 1 4.13 3.24 2.23 7.07l3.61 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

        <form onSubmit={handleEmailAuth} style={styles.form}>
          <input
            style={{ ...styles.input, ...(error ? styles.inputError : {}) }}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <input
            style={{ ...styles.input, ...(error ? styles.inputError : {}) }}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            style={{ ...styles.btn, ...styles.btnPrimary, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button style={styles.toggleLink} onClick={toggleMode}>
          {mode === "signin" ? (
            <>
              Don't have an account? <span style={styles.linkText}>Create one</span>
            </>
          ) : (
            <>
              Already have an account? <span style={styles.linkText}>Sign in</span>
            </>
          )}
        </button>

        <button
          style={{ ...styles.guestLink, opacity: loading ? 0.5 : 1 }}
          onClick={handleGuest}
          disabled={loading}
        >
          Continue as guest
        </button>
      </div>
    </div>
  );
}

const styles = {
  screen: {
    flex: 1,
    display: "flex",
    background: "#F1EFE8",
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px",
    textAlign: "center",
    gap: "16px",
  },
  wordmark: {
    fontSize: "36px",
    fontWeight: 700,
    color: "#085041",
    letterSpacing: "-0.5px",
  },
  tagline: {
    fontSize: "15px",
    color: "#888780",
    margin: 0,
    marginBottom: "8px",
  },
  btn: {
    marginTop: "8px",
    background: "#1D9E75",
    color: "white",
    border: "none",
    borderRadius: "12px",
    padding: "16px 32px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    maxWidth: "300px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  btnPrimary: {
    background: "#085041",
  },
  googleIcon: {
    flexShrink: 0,
  },
  divider: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    maxWidth: "300px",
    marginTop: "8px",
    marginBottom: "8px",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "#E0DDD5",
  },
  dividerText: {
    padding: "0 16px",
    fontSize: "13px",
    color: "#7A7A72",
    fontWeight: "500",
  },
  form: {
    width: "100%",
    maxWidth: "300px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    fontSize: "15px",
    background: "white",
    border: "1.5px solid #E0DDD5",
    borderRadius: "12px",
    color: "#2C2C2A",
    outline: "none",
    boxSizing: "border-box",
  },
  inputError: {
    borderColor: "#D63D3D",
  },
  error: {
    fontSize: "13px",
    color: "#D63D3D",
    margin: 0,
    lineHeight: "1.4",
  },
  toggleLink: {
    background: "none",
    border: "none",
    color: "#7A7A72",
    fontSize: "14px",
    cursor: "pointer",
    padding: "4px 0",
    marginTop: "4px",
  },
  linkText: {
    color: "#1D9E75",
    fontWeight: "600",
  },
  guestLink: {
    background: "none",
    border: "none",
    color: "#7A7A72",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    padding: "12px 0",
    marginTop: "8px",
    textDecoration: "underline",
    textDecorationColor: "#C9C6BC",
    textUnderlineOffset: "3px",
  },
};
