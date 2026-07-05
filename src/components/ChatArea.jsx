import React, { useState, useEffect, useRef } from "react";
import { Send, Image, X, Smile, MessageSquare, ArrowLeft } from "lucide-react";
import { sendMessage, subscribeToMessages } from "../services/db";

const EMOJIS = ["😀", "😂", "🔥", "👍", "❤️", "🙌", "🎉", "💻", "✨", "🚀", "💡", "👀"];

export default function ChatArea({ 
  activeRoom, 
  currentUser, 
  onToggleSidebar,
  onlineCount = 0
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
      <div className="chat-header">
        <div className="chat-header-info">
          <button className="icon-btn mobile-only-btn" onClick={onToggleSidebar} style={{ display: "none" }}>
            <ArrowLeft size={20} />
          </button>
          <div className="chat-header-details">
            <h3 className="chat-header-title"># {activeRoom.name}</h3>
            <span className="chat-header-subtitle">{activeRoom.description}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--success)", fontWeight: "600", padding: "6px 12px", backgroundColor: "rgba(16, 185, 129, 0.05)", borderRadius: "var(--radius-md)", border: "1px solid rgba(16, 185, 129, 0.1)" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--success)", display: "inline-block" }}></span>
          <span>{onlineCount} {onlineCount === 1 ? "user" : "users"} online</span>
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
        <div 
          className="emoji-picker-container glass-panel"
          style={{
            position: "absolute",
            bottom: "84px",
            left: "24px",
            padding: "10px",
            borderRadius: "12px",
            display: "flex",
            gap: "8px",
            boxShadow: "var(--shadow-lg)",
            zIndex: 10
          }}
        >
          {EMOJIS.map(emoji => (
            <button 
              key={emoji} 
              onClick={() => addEmoji(emoji)}
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "4px",
                transition: "transform 0.1s"
              }}
              onMouseEnter={(e) => e.target.style.transform = "scale(1.2)"}
              onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
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
