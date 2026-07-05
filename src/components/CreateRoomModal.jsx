import React, { useState } from "react";
import { X, Hash, AlignLeft } from "lucide-react";
import { createRoom } from "../services/db";

export default function CreateRoomModal({ currentUser, onClose, onRoomCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      const room = await createRoom(formattedName, description.trim(), currentUser);
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
