import React, { useState } from "react";
import { X, Hash, AlignLeft, Lock, Key } from "lucide-react";
import { createRoom } from "../services/db";

const generateInviteCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function CreateRoomModal({ currentUser, onClose, onRoomCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePrivateToggle = (checked) => {
    setIsPrivate(checked);
    if (checked && !inviteCode) {
      setInviteCode(generateInviteCode());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formattedName = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "");

    if (!formattedName) {
      setError("Please enter a valid room name.");
      setLoading(false);
      return;
    }

    try {
      const room = await createRoom(
        formattedName, 
        description.trim(), 
        currentUser, 
        isPrivate, 
        isPrivate ? inviteCode : ""
      );
      onRoomCreated(room);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create room.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <div className="modal-header">
          <h3 className="modal-title">Create New Room</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert-error">{error}</div>}

            <div className="input-group">
              <label>Room Name</label>
              <div className="input-field-wrapper">
                <input
                  type="text"
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. tech-talk"
                  required
                />
                <Hash size={18} />
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                Name must be lowercase, alphanumeric, and may contain hyphens.
              </span>
            </div>

            <div className="input-group">
              <label>Description</label>
              <div className="input-field-wrapper">
                <input
                  type="text"
                  className="input-field"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this channel about?"
                />
                <AlignLeft size={18} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", marginTop: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Lock size={16} color={isPrivate ? "var(--warning)" : "var(--text-muted)"} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--text-primary)" }}>Private Channel</span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Only members with the invite code can view this channel</span>
                  </div>
                </div>
                <label className="switch" style={{ position: "relative", display: "inline-block", width: "40px", height: "20px" }}>
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => handlePrivateToggle(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span className="slider" style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: isPrivate ? "var(--accent-primary)" : "#4b5563", transition: ".3s", borderRadius: "20px" }}>
                    <span style={{ position: "absolute", content: '""', height: "14px", width: "14px", left: isPrivate ? "23px" : "3px", bottom: "3px", backgroundColor: "#fff", transition: ".3s", borderRadius: "50%" }}></span>
                  </span>
                </label>
              </div>

              {isPrivate && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(99, 102, 241, 0.05)", border: "1px dashed rgba(99, 102, 241, 0.2)", borderRadius: "var(--radius-sm)", padding: "8px 12px", marginTop: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Key size={14} color="var(--accent-primary)" />
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Generated Invite Code:</span>
                  </div>
                  <strong style={{ fontSize: "14px", color: "var(--accent-primary)", letterSpacing: "1px" }}>{inviteCode}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-sec" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-modal-primary" disabled={loading}>
              {loading ? "Creating..." : "Create Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
