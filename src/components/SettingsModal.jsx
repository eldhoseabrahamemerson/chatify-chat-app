import React, { useState } from "react";
import { X, User, Upload } from "lucide-react";
import { updateProfile } from "../services/auth";

export default function SettingsModal({ currentUser, onClose, onUpdateUser }) {
  const [displayName, setDisplayName] = useState(currentUser.displayName || "");
  const [status, setStatus] = useState(currentUser.status || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(currentUser.photoURL || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 800 * 1024) {
        setError("Avatar photo exceeds 800KB. Please choose a smaller file to fit the Firebase Free Plan.");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!displayName.trim()) {
      setError("Username cannot be empty.");
      setLoading(false);
      return;
    }

    try {
      const updatedUser = await updateProfile({
        displayName: displayName.trim(),
        status: status.trim(),
        avatarFile
      });
      onUpdateUser(updatedUser);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update profile settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <div className="modal-header">
          <h3 className="modal-title">Profile Settings</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {error && <div className="alert-error">{error}</div>}

            <div className="avatar-upload-container">
              <label htmlFor="settings-avatar-input">
                <div className="avatar-preview-box">
                  <img src={avatarPreview} alt="User Avatar" />
                </div>
              </label>
              <input
                id="settings-avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: "none" }}
              />
              <span style={{ fontSize: "12px", color: "var(--accent-primary)" }}>
                Click image to replace avatar
              </span>
            </div>

            <div className="input-group">
              <label>Username</label>
              <div className="input-field-wrapper">
                <input
                  type="text"
                  className="input-field"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Username"
                />
                <User size={18} />
              </div>
            </div>

            <div className="input-group">
              <label>Status Message</label>
              <div className="input-field-wrapper">
                <input
                  type="text"
                  className="input-field"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  placeholder="e.g. Coding away..."
                />
                <User size={18} />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-sec" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-modal-primary" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
