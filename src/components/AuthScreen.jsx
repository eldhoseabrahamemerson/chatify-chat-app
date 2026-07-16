import React, { useState } from "react";
import { Mail, Lock, User, Upload, MessageSquare, AlertTriangle } from "lucide-react";
import { signIn, signUp, signInWithGoogle } from "../services/auth";

export default function AuthScreen({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 800 * 1024) {
        setError("Avatar photo exceeds 800KB. Please choose a smaller file to fit the Firebase Free Plan.");
        return;
      }
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      onAuthSuccess(user);
    } catch (err) {
      console.error(err);
      let friendlyMessage = "Google sign-in failed. Please try again.";
      if (err.message) {
        friendlyMessage = err.message.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim();
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    if (isSignUp && !displayName) {
      setError("Please enter a username.");
      setLoading(false);
      return;
    }

    try {
      let user;
      if (isSignUp) {
        user = await signUp(email, password, displayName, avatar);
      } else {
        user = await signIn(email, password);
      }
      onAuthSuccess(user);
    } catch (err) {
      console.error(err);
      let friendlyMessage = "Authentication failed. Please check your credentials.";
      
      const errCode = err.code || "";
      if (errCode.includes("invalid-credential")) {
        friendlyMessage = isSignUp 
          ? "Invalid details. Please verify your registration form inputs."
          : "Incorrect email or password. If you do not have an account yet, click 'Sign Up' below first.";
      } else if (errCode.includes("email-already-in-use")) {
        friendlyMessage = "This email address is already registered. Please sign in instead.";
      } else if (errCode.includes("weak-password")) {
        friendlyMessage = "Password is too weak. Please use at least 6 characters.";
      } else if (errCode.includes("invalid-email")) {
        friendlyMessage = "Please enter a valid email address.";
      } else if (errCode.includes("user-not-found")) {
        friendlyMessage = "No user found with this email. Click 'Sign Up' below to create a new account.";
      } else if (errCode.includes("wrong-password")) {
        friendlyMessage = "Incorrect password. Please check your credentials and try again.";
      } else if (err.message) {
        // Strip out the Firebase boilerplate prefix if present
        friendlyMessage = err.message.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim();
      }
      
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setEmail("");
    setPassword("");
    setDisplayName("");
    setAvatar(null);
    setAvatarPreview("");
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <div className="auth-logo">
            <MessageSquare size={28} />
            <span>Chatify</span>
          </div>
          <p className="auth-subtitle">
            {isSignUp 
              ? "Create your account to start communicating" 
              : "Sign in to access your chat rooms"}
          </p>
        </div>

        {error && (
          <div className="alert-error">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignUp && (
            <>
              <div className="avatar-upload-container">
                <label htmlFor="avatar-file-input">
                  <div className="avatar-preview-box">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" />
                    ) : (
                      <div className="avatar-upload-placeholder">
                        <Upload size={20} />
                        <span>Upload Photo</span>
                      </div>
                    )}
                  </div>
                </label>
                <input
                  id="avatar-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="input-group">
                <label>Username</label>
                <div className="input-field-wrapper">
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    className="input-field"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                  <User size={18} />
                </div>
              </div>
            </>
          )}

          <div className="input-group">
            <label>Email Address</label>
            <div className="input-field-wrapper">
              <input
                type="email"
                placeholder="you@example.com"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail size={18} />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-field-wrapper">
              <input
                type="password"
                placeholder="••••••••"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <Lock size={18} />
            </div>
          </div>

          {isSignUp && (
            <span style={{ fontSize: "11.5px", color: "var(--text-muted)", textAlign: "center", marginTop: "-8px", display: "block" }}>
              * You will need to verify your email address before signing in.
            </span>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span>Processing...</span>
            ) : (
              <span>{isSignUp ? "Create Account" : "Sign In"}</span>
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button 
          type="button" 
          onClick={handleGoogleSignIn} 
          className="btn-google"
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.783 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.59.102-1.167.282-1.707V4.961H.957C.347 6.177 0 7.55 0 9s.347 2.823.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.32 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.217.957 5.273l3.007 2.332C4.672 5.164 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-switch">
          <span>
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
          </span>
          <button onClick={toggleAuthMode} className="auth-switch-btn">
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
