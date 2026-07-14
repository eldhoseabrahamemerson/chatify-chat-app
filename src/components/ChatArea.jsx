import React, { useState, useEffect, useRef } from "react";
import { Send, Image, X, Smile, MessageSquare, ArrowLeft, Lock, Key, LogOut } from "lucide-react";
import { sendMessage, subscribeToMessages } from "../services/db";

const EMOJIS = ["😀", "😂", "🔥", "👍", "❤️", "🙌", "🎉", "💻", "✨", "🚀", "💡", "👀"];

export default function ChatArea({ 
  activeRoom, 
  currentUser, 
  onToggleSidebar,
  usersInRoom = [],
  onLeaveRoom
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const scrollRef = useRef(null);

  // Subscribe to messages when activeRoom change
  useEffect(() => {
    if (!activeRoom) return;

    setMessages([]);
    const unsubscribe = subscribeToMessages(activeRoom.id, (msgs) => {
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [activeRoom]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 800 * 1024) {
        alert("Image exceeds 800KB. Please choose a smaller file to send using the Firebase Free Plan.");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !imageFile) return;

    setLoading(true);
    const textToSend = inputText;
    const imgFile = imageFile;
    
    setInputText("");
    handleRemoveImage();
    setShowEmojiPicker(false);

    try {
      await sendMessage(activeRoom.id, textToSend, imgFile, currentUser);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLeave = async () => {
    if (window.confirm(`Are you sure you want to leave #${activeRoom.name}?`)) {
      try {
        await onLeaveRoom(activeRoom.id);
      } catch (error) {
        console.error("Failed to leave room:", error);
      }
    }
  };

  const addEmoji = (emoji) => {
    setInputText(prev => prev + emoji);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!activeRoom) {
    return (
      <div className="chat-panel">
        <div className="chat-empty-state">
          <div className="chat-empty-icon">
            <MessageSquare size={36} />
          </div>
          <h2>Welcome to Chatify!</h2>
          <p>
            Choose a discussion room from the sidebar menu, or start a new community channel to begin chatting in real-time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      {/* Chat Header */}
      <div className="chat-header" style={{ gap: "12px", flexWrap: "wrap", height: "auto", minHeight: "68px", padding: "10px 24px" }}>
        <div className="chat-header-info">
          <button className="icon-btn mobile-only-btn" onClick={onToggleSidebar}>
            <ArrowLeft size={20} />
          </button>
          <div className="chat-header-details">
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <h3 className="chat-header-title"># {activeRoom.name}</h3>
              {activeRoom.isPrivate && <Lock size={14} color="var(--warning)" />}
            </div>
            <span className="chat-header-subtitle">
              {activeRoom.description} &bull; Created by {activeRoom.createdBy || "System"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {activeRoom.isPrivate && (
            <div 
              onClick={() => {
                navigator.clipboard.writeText(activeRoom.inviteCode);
                alert(`Invite Code "${activeRoom.inviteCode}" copied to clipboard!`);
              }}
              title="Click to copy invite code"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                color: "var(--warning)",
                backgroundColor: "rgba(245, 158, 11, 0.05)",
                border: "1px solid rgba(245, 158, 11, 0.15)",
                borderRadius: "8px",
                padding: "6px 10px",
                cursor: "pointer",
                userSelect: "none"
              }}
            >
              <Key size={12} />
              <span>Code: <strong>{activeRoom.inviteCode}</strong></span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--success)", fontWeight: "600", padding: "6px 12px", backgroundColor: "rgba(16, 185, 129, 0.05)", borderRadius: "var(--radius-md)", border: "1px solid rgba(16, 185, 129, 0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", marginRight: "4px" }}>
              {usersInRoom.slice(0, 3).map((user, idx) => (
                <img 
                  key={user.uid}
                  src={user.photoURL}
                  alt={user.displayName}
                  title={`${user.displayName} is in this room`}
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    border: "1.5px solid var(--bg-secondary)",
                    marginLeft: idx > 0 ? "-6px" : "0",
                    objectFit: "cover"
                  }}
                />
              ))}
              {usersInRoom.length > 3 && (
                <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "4px" }}>
                  +{usersInRoom.length - 3}
                </span>
              )}
            </div>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--success)", display: "inline-block" }}></span>
            <span>{usersInRoom.length} active</span>
          </div>

          {activeRoom.id !== "room_general" && (
            <button 
              onClick={handleLeave}
              className="btn-sec"
              title="Leave this channel"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                padding: "6px 12px",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "var(--radius-md)",
                color: "var(--danger)",
                backgroundColor: "rgba(239, 68, 68, 0.05)",
                cursor: "pointer",
                fontWeight: "600",
                transition: "var(--transition-fast)"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
                e.target.style.borderColor = "rgba(239, 68, 68, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "rgba(239, 68, 68, 0.05)";
                e.target.style.borderColor = "rgba(239, 68, 68, 0.2)";
              }}
            >
              <LogOut size={13} />
              <span>Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Feed */}
      <div className="message-feed">
        {messages.length === 0 ? (
          <div className="empty-list-notice">
            No messages yet. Send a message to start the conversation!
          </div>
        ) : (
          messages.map((msg, index) => {
            const isSelf = msg.senderId === currentUser.uid;
            return (
              <div 
                key={msg.id || index} 
                className={`message-group ${isSelf ? "self" : "other"}`}
              >
                {!isSelf && (
                  <img 
                    src={msg.senderAvatar} 
                    alt={msg.senderName} 
                    className="message-sender-avatar"
                  />
                )}
                <div className="message-content-wrapper">
                  {!isSelf && <span className="message-sender-name">{msg.senderName}</span>}
                  <div className="message-bubble">
                    {msg.text && <p>{msg.text}</p>}
                    {msg.imageUrl && (
                      <img 
                        src={msg.imageUrl} 
                        alt="Shared image" 
                        className="message-image" 
                        onClick={() => window.open(msg.imageUrl, '_blank')}
                      />
                    )}
                  </div>
                  <div className="message-meta">
                    <span>{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Emoji suggestion panel */}
      {showEmojiPicker && (
        <div className="emoji-picker-container glass-panel">
          {EMOJIS.map(emoji => (
            <button 
              key={emoji} 
              onClick={() => addEmoji(emoji)}
              className="emoji-btn"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input container */}
      <div className="chat-input-container">
        {imagePreview && (
          <div className="image-preview-badge">
            <img src={imagePreview} alt="upload preview" />
            <span>Attachment ready</span>
            <button onClick={handleRemoveImage}>
              <X size={14} />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="chat-input-bar">
          <button 
            type="button" 
            className={`input-action-btn ${showEmojiPicker ? "active" : ""}`}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile size={20} />
          </button>

          <label className="input-action-btn">
            <Image size={20} />
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageChange} 
              style={{ display: "none" }} 
            />
          </label>

          <input
            type="text"
            placeholder={`Message #${activeRoom.name}...`}
            className="message-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={loading}
          />

          <button 
            type="submit" 
            className="btn-send"
            disabled={(!inputText.trim() && !imageFile) || loading}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
