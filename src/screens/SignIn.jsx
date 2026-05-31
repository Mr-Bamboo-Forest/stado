import { useState } from "react";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const provider = new GoogleAuthProvider();

// ─── Eye Icon SVG ──────────────────────────────────────────────────────────
function EyeIcon({ visible }) {
  return visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ─── Password Input with Eye Toggle ────────────────────────────────────────
function PasswordInput({ style, errorStyle, successStyle, placeholder, value, onChange, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ ...styles.passwordWrapper, ...(style || {}) }}>
      <input
        style={{ ...styles.input, ...styles.passwordInput }}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        disabled={disabled}
      />
      <button
        type="button"
        style={styles.eyeBtn}
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
      >
        <EyeIcon visible={show} />
      </button>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function SignIn({ onSuccess }) {
  // mode: "signin" | "signup" | "verify" | "forgot" | "forgotSent"
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Verification state
  const [verifyCode, setVerifyCode] = useState("");
  const [pendingUser, setPendingUser] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const passwordRules = [
    { label: "At least 6 characters", test: (p) => p.length >= 6 },
    { label: "Uppercase letter", test: (p) => /[A-Z]/.test(p) },
    { label: "Lowercase letter", test: (p) => /[a-z]/.test(p) },
    { label: "Number", test: (p) => /[0-9]/.test(p) },
    { label: "Symbol (e.g. !@#$)", test: (p) => /[^A-Za-z0-9]/.test(p) },
  ];

  const allRulesMet = passwordRules.every((r) => r.test(password));
  const passwordsMatch = password === confirmPassword;

  // ── Send 6-digit verification code ────────────────────────────────────────
  const sendVerificationCode = async (userEmail) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store code in Firestore
    await setDoc(doc(db, "pendingVerifications", userEmail), { code, expires });

    // Send via API
    await fetch("/api/sendVerificationCode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, code }),
    });
  };

  // ── Google Sign-In ─────────────────────────────────────────────────────────
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

  // ── Email Sign-In / Sign-Up ────────────────────────────────────────────────
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "signup") {
      if (!allRulesMet) {
        setError("Please meet all password requirements.");
        setLoading(false);
        return;
      }
      if (!passwordsMatch) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }
    }

    try {
      if (mode === "signup") {
        // Create account but don't call onSuccess yet — verify email first
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        setPendingUser(cred.user);
        await sendVerificationCode(email);
        setMode("verify");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onSuccess();
      }
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

  // ── Verify 6-digit code ────────────────────────────────────────────────────
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const ref = doc(db, "pendingVerifications", email);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setError("Verification code not found. Please request a new one.");
        setLoading(false);
        return;
      }
      const { code, expires } = snap.data();
      if (Date.now() > expires) {
        setError("Code has expired. Please request a new one.");
        await deleteDoc(ref);
        setLoading(false);
        return;
      }
      if (verifyCode.trim() !== code) {
        setError("Incorrect code. Please try again.");
        setLoading(false);
        return;
      }
      // Code is correct — clean up and proceed
      await deleteDoc(ref);
      onSuccess();
    } catch (err) {
      console.error(err);
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend code ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    try {
      await sendVerificationCode(email);
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((c) => {
          if (c <= 1) { clearInterval(interval); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      setError("Failed to resend code. Please try again.");
    }
  };

  // ── Forgot Password ────────────────────────────────────────────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMode("forgotSent");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-email") {
        setError("No account found with that email address.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Guest ──────────────────────────────────────────────────────────────────
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
    setConfirmPassword("");
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: Verification screen
  // ════════════════════════════════════════════════════════════════════════════
  if (mode === "verify") {
    return (
      <div style={styles.screen}>
        <div style={styles.content}>
          <span style={styles.wordmark}>stado</span>
          <div style={styles.verifyIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#085041" strokeWidth="1.8">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M2 7l10 7 10-7" />
            </svg>
          </div>
          <p style={styles.verifyTitle}>Check your email</p>
          <p style={styles.verifySubtitle}>
            We sent a 6-digit code to<br />
            <strong style={{ color: "#2C2C2A" }}>{email}</strong>
          </p>

          <form onSubmit={handleVerifyCode} style={styles.form}>
            <input
              style={{ ...styles.input, textAlign: "center", letterSpacing: "8px", fontSize: "22px", fontWeight: "700" }}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              disabled={loading}
              autoFocus
            />

            {error && <p style={styles.error}>{error}</p>}

            <button
              type="submit"
              style={{ ...styles.btn, ...styles.btnPrimary, opacity: loading || verifyCode.length < 6 ? 0.5 : 1 }}
              disabled={loading || verifyCode.length < 6}
            >
              {loading ? "Verifying…" : "Verify account"}
            </button>
          </form>

          <button style={styles.toggleLink} onClick={handleResend} disabled={resendCooldown > 0}>
            {resendCooldown > 0 ? (
              <span style={{ color: "#7A7A72" }}>Resend code in {resendCooldown}s</span>
            ) : (
              <>Didn't get it? <span style={styles.linkText}>Resend code</span></>
            )}
          </button>

          <button style={styles.guestLink} onClick={() => { setMode("signup"); setVerifyCode(""); setError(""); }}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: Forgot password screen
  // ════════════════════════════════════════════════════════════════════════════
  if (mode === "forgot") {
    return (
      <div style={styles.screen}>
        <div style={styles.content}>
          <span style={styles.wordmark}>stado</span>
          <p style={styles.verifyTitle}>Reset your password</p>
          <p style={styles.verifySubtitle}>Enter your email and we'll send you a link to create a new password.</p>

          <form onSubmit={handleForgotPassword} style={styles.form}>
            <input
              style={{ ...styles.input, ...(error ? styles.inputError : {}) }}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoFocus
            />

            {error && <p style={styles.error}>{error}</p>}

            <button
              type="submit"
              style={{ ...styles.btn, ...styles.btnPrimary, opacity: loading ? 0.5 : 1 }}
              disabled={loading}
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>

          <button style={styles.toggleLink} onClick={() => { setMode("signin"); setError(""); }}>
            ← <span style={styles.linkText}>Back to sign in</span>
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: Forgot password sent confirmation
  // ════════════════════════════════════════════════════════════════════════════
  if (mode === "forgotSent") {
    return (
      <div style={styles.screen}>
        <div style={styles.content}>
          <span style={styles.wordmark}>stado</span>
          <div style={styles.verifyIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="1.8">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="M22 4L12 14.01l-3-3" />
            </svg>
          </div>
          <p style={styles.verifyTitle}>Email sent!</p>
          <p style={styles.verifySubtitle}>
            Check <strong style={{ color: "#2C2C2A" }}>{email}</strong> for a link to reset your password.
          </p>

          <button
            style={{ ...styles.btn, ...styles.btnPrimary, marginTop: "8px" }}
            onClick={() => { setMode("signin"); setError(""); }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: Sign in / Sign up
  // ════════════════════════════════════════════════════════════════════════════
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

          <PasswordInput
            style={error && mode === "signup" && !allRulesMet ? styles.inputError : {}}
            placeholder={mode === "signup" ? "Create password" : "Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          {mode === "signin" && (
            <button
              type="button"
              style={styles.forgotLink}
              onClick={() => { setMode("forgot"); setError(""); }}
            >
              Forgot password?
            </button>
          )}

          {mode === "signup" && (
            <>
              <div style={styles.requirementsList}>
                {passwordRules.map((rule) => {
                  const met = rule.test(password);
                  return (
                    <div key={rule.label} style={styles.requirementRow}>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={met ? "#1D9E75" : "#D63D3D"}
                        strokeWidth="2.5"
                        style={{ flexShrink: 0, marginTop: "1px" }}
                      >
                        {met ? (
                          <path d="M5 12l5 5L20 7" />
                        ) : (
                          <path d="M18 6L6 18M6 6l12 12" />
                        )}
                      </svg>
                      <span style={{ ...styles.requirementText, color: met ? "#1D9E75" : "#D63D3D" }}>
                        {rule.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <PasswordInput
                style={{
                  ...(confirmPassword && !passwordsMatch ? styles.inputError : {}),
                  ...(confirmPassword && passwordsMatch ? styles.inputSuccess : {}),
                }}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
              {confirmPassword && !passwordsMatch && (
                <p style={{ ...styles.error, marginTop: "-4px" }}>Passwords do not match.</p>
              )}
            </>
          )}

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            style={{
              ...styles.btn,
              ...styles.btnPrimary,
              opacity: loading || (mode === "signup" && (!allRulesMet || !passwordsMatch)) ? 0.5 : 1,
            }}
            disabled={loading || (mode === "signup" && (!allRulesMet || !passwordsMatch))}
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
  inputSuccess: {
    borderColor: "#1D9E75",
  },
  passwordWrapper: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    background: "white",
    border: "1.5px solid #E0DDD5",
    borderRadius: "12px",
    overflow: "hidden",
  },
  passwordInput: {
    flex: 1,
    border: "none",
    borderRadius: 0,
    paddingRight: "8px",
    outline: "none",
    background: "transparent",
    minWidth: 0,
  },
  eyeBtn: {
    flexShrink: 0,
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#7A7A72",
    padding: "0 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    lineHeight: 1,
  },
  requirementsList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "10px 12px",
    background: "white",
    borderRadius: "12px",
    border: "1.5px solid #E0DDD5",
  },
  requirementRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
  },
  requirementText: {
    fontSize: "13px",
    fontWeight: "500",
    lineHeight: "1.4",
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
  forgotLink: {
    background: "none",
    border: "none",
    color: "#1D9E75",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "0",
    textAlign: "right",
    marginTop: "-4px",
    width: "100%",
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
  verifyIcon: {
    width: "72px",
    height: "72px",
    borderRadius: "20px",
    background: "#E8F5F1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px",
  },
  verifyTitle: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#085041",
    margin: 0,
  },
  verifySubtitle: {
    fontSize: "14px",
    color: "#7A7A72",
    margin: 0,
    lineHeight: "1.6",
    maxWidth: "260px",
  },
};