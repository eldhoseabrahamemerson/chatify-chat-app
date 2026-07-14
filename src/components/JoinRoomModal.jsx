import React, { useState } from "react";
import { X, Key } from "lucide-react";
import { joinRoomWithCode } from "../services/db";

export default function JoinRoomModal({ currentUser, onClose, onRoomJoined }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    const formattedCode = code.trim().toUpperCase();
    if (formattedCode.length !== 6) {
      setError("Invite code must be exactly 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const room = await joinRoomWithCode(formattedCode, currentUser);
      onRoomJoined(room);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Invalid invite code or room not found.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: "400px" }}>
        <div className="modal-header">
          <h3 className="modal-title">Join Private Room</h3>
          <button className="icon-btn" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ textAlign: "center", gap: "16px" }}>
            {error && <div className="alert-error" style={{ textAlign: "left" }}>{error}</div>}

            <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
              <div 
                style={{ 
                  width: "56px", 
                  height: "56px", 
                  borderRadius: "50%", 
                  backgroundColor: "rgba(16, 185, 129, 0.1)", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  color: "var(--success)"
                }}
              >
                <Key size={24} />
              </div>
            </div>

            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Enter the 6-character invite code to join a private discussion room.
            </p>

            <div className="input-group" style={{ marginTop: "8px" }}>
              <div className="input-field-wrapper">
                <input
                  type="text"
                  className="input-field"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="e.g. AB12CD"
                  style={{ textAlign: "center", letterSpacing: "4px", fontSize: "18px", fontWeight: "bold" }}
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-sec" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-modal-primary" style={{ backgroundColor: "var(--success)" }} disabled={loading}>
              {loading ? "Joining..." : "Join Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
