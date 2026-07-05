import React, { useState } from "react";
import { Mail, Lock, User, Upload, MessageSquare, AlertTriangle } from "lucide-react";
import { signIn, signUp } from "../services/auth";

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

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span>Processing...</span>
            ) : (
              <span>{isSignUp ? "Create Account" : "Sign In"}</span>
            )}
          </button>
        </form>

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
