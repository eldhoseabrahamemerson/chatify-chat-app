import React from "react";
import { Search, Plus, Settings, LogOut, MessageSquare, Hash } from "lucide-react";
import { signOut } from "../services/auth";

export default function Sidebar({
  currentUser,
  rooms,
  activeRoom,
  setActiveRoom,
  searchQuery,
  setSearchQuery,
  onOpenSettings,
  onOpenCreateRoom,
  isMobileOpen,
  setIsMobileOpen,
  onlineUsers = []
}) {
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (room.description && room.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={`sidebar glass-panel ${isMobileOpen ? "mobile-open" : ""}`}>
      {/* Sidebar Profile Header */}
      <div className="user-profile-header">
        <div className="user-info">
          <div className="user-avatar-wrapper">
            <img 
              src={currentUser.photoURL} 
              alt={currentUser.displayName} 
              className="user-avatar" 
            />
            <div className="status-indicator"></div>
          </div>
          <div className="user-meta">
            <span className="user-name">{currentUser.displayName}</span>
            <span className="user-status">{currentUser.status || "Active"}</span>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="icon-btn" 
            onClick={onOpenSettings} 
            title="Settings"
          >
            <Settings size={18} />
          </button>
          <button 
            className="icon-btn" 
            onClick={handleLogout} 
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="sidebar-search-area">
        <div className="search-wrapper">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search channels..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <button className="btn-create-room" onClick={onOpenCreateRoom}>
          <Plus size={16} />
          <span>New Room</span>
        </button>
      </div>

      {/* Room list */}
      <div className="room-list-container" style={{ flex: 1 }}>
        <div className="room-list-title">Rooms & Channels</div>
        {filteredRooms.length === 0 ? (
          <div className="empty-list-notice">
            {searchQuery ? "No rooms match search" : "No rooms available"}
          </div>
        ) : (
          filteredRooms.map((room) => {
            const isActive = activeRoom && activeRoom.id === room.id;
            return (
              <button
                key={room.id}
                className={`room-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  setActiveRoom(room);
                  setIsMobileOpen(false); // Close sidebar on mobile
                }}
              >
                <div className="room-icon-box">
                  <Hash size={18} />
                </div>
                <div className="room-details">
                  <div className="room-title-row">
                    <span className="room-name">{room.name}</span>
                  </div>
                  <span className="room-preview-text">
                    {room.description || "Jump in and say hello!"}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Online Users List */}
      <div className="room-list-container" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "15px", flex: "0 0 180px", maxHeight: "180px" }}>
        <div className="room-list-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Online Users</span>
          <span style={{ backgroundColor: "var(--accent-glow)", color: "var(--accent-primary)", padding: "2px 6px", borderRadius: "8px", fontSize: "10px", fontWeight: "700" }}>
            {onlineUsers.length}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", padding: "4px 8px" }}>
          {onlineUsers.map(user => (
            <div key={user.uid} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
              <div style={{ position: "relative", width: "24px", height: "24px", flexShrink: 0 }}>
                <img 
                  src={user.photoURL} 
                  alt={user.displayName} 
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} 
                />
                <div style={{ position: "absolute", bottom: "-1px", right: "-1px", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--success)", border: "1.5px solid var(--bg-secondary)" }}></div>
              </div>
              <span style={{ color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.displayName}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
