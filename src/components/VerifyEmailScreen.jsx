import React, { useState, useEffect } from "react";
import { Mail, CheckCircle, RefreshCw, ArrowLeft, AlertCircle } from "lucide-react";
import { auth, isFirebaseConfigured } from "../services/firebase";
import { signOut } from "../services/auth";
import { sendEmailVerification } from "firebase/auth";

export default function VerifyEmailScreen({ currentUser, onVerified }) {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleCheckVerification = async () => {
    if (!isFirebaseConfigured) {
      onVerified({ ...currentUser, emailVerified: true });
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          setSuccess("Verification successful! Redirecting...");
          setTimeout(() => {
            onVerified({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email.split("@")[0],
              photoURL: user.photoURL,
              status: "Active",
              emailVerified: true
            });
          }, 1500);
        } else {
          setError("Your email address is still not verified. Please check your inbox and click the verification link.");
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to refresh user session.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!isFirebaseConfigured) return;
    setResending(true);
    setError("");
    setSuccess("");

    try {
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        setSuccess("Verification email resent successfully! Please check your spam folder if you do not see it.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error(err);
    }
  };

  // Poll for verification status automatically every 5 seconds
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    
    const interval = setInterval(async () => {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          clearInterval(interval);
          onVerified({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split("@")[0],
            photoURL: user.photoURL,
            status: "Active",
            emailVerified: true
          });
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [onVerified]);

  return (
    <div className="auth-wrapper">
      <div className="auth-card glass-panel" style={{ maxWidth: "440px", padding: "40px 32px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
          <div 
            style={{ 
              width: "64px", 
              height: "64px", 
              borderRadius: "50%", 
              backgroundColor: "var(--accent-glow)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              color: "var(--accent-primary)",
              border: "1px solid rgba(99, 102, 241, 0.2)"
            }}
          >
            <Mail size={28} />
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "8px", background: "linear-gradient(135deg, #fff 0%, #818cf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Verify Your Email
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
            We've sent a verification link to your email address:
          </p>
          <div style={{ margin: "16px 0", padding: "10px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", fontSize: "14.5px", fontWeight: "600", color: "var(--text-primary)", wordBreak: "break-all" }}>
            {currentUser?.email}
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5" }}>
            Please open the email and click the link to activate your account. If you don't verify your email, you won't be able to enter the chat.
          </p>
        </div>

        {error && (
          <div className="alert-error" style={{ textAlign: "left" }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", borderRadius: "var(--radius-md)", backgroundColor: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", color: "#a7f3d0", fontSize: "13px", textAlign: "left" }}>
            <CheckCircle size={16} color="var(--success)" />
            <span>{success}</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
          <button 
            onClick={handleCheckVerification} 
            className="btn-primary" 
            disabled={loading}
            style={{ height: "46px" }}
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" style={{ marginRight: "8px" }} />
                Checking...
              </>
            ) : (
              <span>I have verified my email</span>
            )}
          </button>

          <div style={{ display: "flex", gap: "12px" }}>
            <button 
              onClick={handleResendEmail} 
              className="btn-sec" 
              disabled={resending}
              style={{ flex: 1, height: "42px", fontSize: "13px" }}
            >
              {resending ? "Resending..." : "Resend Email"}
            </button>
            
            <button 
              onClick={handleLogout} 
              className="btn-sec"
              style={{ flex: 1, height: "42px", fontSize: "13px", color: "var(--text-secondary)", borderColor: "rgba(255, 255, 255, 0.1)", backgroundColor: "rgba(255, 255, 255, 0.02)" }}
            >
              <ArrowLeft size={14} style={{ marginRight: "6px" }} />
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
