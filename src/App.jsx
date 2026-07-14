import React, { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "./services/auth";
import { subscribeToRooms, updateUserPresence, subscribeToOnlineUsers, leaveRoom } from "./services/db";
import { isFirebaseConfigured } from "./services/firebase";
import AuthScreen from "./components/AuthScreen";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import SettingsModal from "./components/SettingsModal";
import CreateRoomModal from "./components/CreateRoomModal";
import JoinRoomModal from "./components/JoinRoomModal";
import { MessageSquare } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals state
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Listen to Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      
      // Clear active room if logged out
      if (!user) {
        setActiveRoom(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const activeRoomRef = useRef(activeRoom);

  // Update room reference and presence when room changes
  useEffect(() => {
    activeRoomRef.current = activeRoom;
    if (currentUser) {
      updateUserPresence(currentUser, "online", activeRoom?.id);
    }
  }, [activeRoom, currentUser]);

  // Handle Presence Heartbeat & Online Subscriptions
  useEffect(() => {
    if (!currentUser) {
      setOnlineUsers([]);
      return;
    }

    // Mark online initially
    updateUserPresence(currentUser, "online", activeRoomRef.current?.id);

    const heartbeat = setInterval(() => {
      updateUserPresence(currentUser, "online", activeRoomRef.current?.id);
    }, 45000);

    const unsubscribe = subscribeToOnlineUsers((list) => {
      setOnlineUsers(list);
    });

    return () => {
      clearInterval(heartbeat);
      unsubscribe();
      updateUserPresence(currentUser, "offline", null);
    };
  }, [currentUser]);

  // Listen to channels/rooms list once user is logged in
  useEffect(() => {
    if (!currentUser) {
      setRooms([]);
      return;
    }

    const unsubscribe = subscribeToRooms(currentUser, (updatedRooms) => {
      // Sort rooms so that the latest created is first, or by system fallback
      const sorted = [...updatedRooms].sort((a, b) => b.createdAt - a.createdAt);
      setRooms(sorted);
      
      // Auto-select general or first room if no room is selected
      if (sorted.length > 0 && !activeRoom) {
        // Look for General room first
        const general = sorted.find(r => r.id === "room_general") || sorted[0];
        setActiveRoom(general);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Auto-open mobile sidebar if no room is selected (helps on mobile onboarding)
  useEffect(() => {
    if (!activeRoom) {
      setIsMobileSidebarOpen(true);
    }
  }, [activeRoom]);

  const handleLeaveRoom = async (roomId) => {
    try {
      await leaveRoom(roomId, currentUser);
      setActiveRoom(null);
    } catch (e) {
      console.error("Failed to leave room:", e);
      alert("Failed to leave room.");
    }
  };

  if (authLoading) {
    return (
      <div 
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100vw",
          height: "100vh",
          backgroundColor: "#0b0f19",
          gap: "16px"
        }}
      >
        <MessageSquare size={36} color="#6366f1" style={{ animation: "pulse 1.5s infinite" }} />
        <span style={{ fontSize: "14px", color: "#9ca3af", fontWeight: 500 }}>
          Initializing Chatify...
        </span>
      </div>
    );
  }

  // Auth Gate
  if (!currentUser) {
    return <AuthScreen onAuthSuccess={setCurrentUser} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw" }}>
      {/* Premium Mock Mode Banner */}
      {!isFirebaseConfigured && (
        <div className="demo-banner">
          <span>
            🚀 Running in <strong>Mock Demo Mode</strong> (data is saved locally in this browser tab).
          </span>
          <button 
            className="demo-banner-btn"
            onClick={() => {
              alert(
                "To connect to live Firebase:\n1. Rename the '.env.example' file to '.env' in your project root.\n2. Create a project in the Firebase Console and copy the credentials.\n3. Restart the dev server!"
              );
            }}
          >
            Connect Live Firebase
          </button>
        </div>
      )}

      <div className="app-container">
        <Sidebar
          currentUser={currentUser}
          rooms={rooms}
          activeRoom={activeRoom}
          setActiveRoom={setActiveRoom}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenSettings={() => setShowSettings(true)}
          onOpenCreateRoom={() => setShowCreateRoom(true)}
          onOpenJoinPrivate={() => setShowJoinRoom(true)}
          isMobileOpen={isMobileSidebarOpen}
          setIsMobileOpen={setIsMobileSidebarOpen}
          onlineUsers={onlineUsers}
        />

        <ChatArea
          activeRoom={activeRoom}
          currentUser={currentUser}
          onToggleSidebar={() => setIsMobileSidebarOpen(true)}
          usersInRoom={onlineUsers.filter(u => u.currentRoomId === activeRoom?.id)}
          onLeaveRoom={handleLeaveRoom}
        />

        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal
            currentUser={currentUser}
            onClose={() => setShowSettings(false)}
            onUpdateUser={setCurrentUser}
          />
        )}

        {/* Create Room Modal */}
        {showCreateRoom && (
          <CreateRoomModal
            currentUser={currentUser}
            onClose={() => setShowCreateRoom(false)}
            onRoomCreated={(newRoom) => {
              setActiveRoom(newRoom);
              setIsMobileSidebarOpen(false);
            }}
          />
        )}

        {/* Join Room Modal */}
        {showJoinRoom && (
          <JoinRoomModal
            currentUser={currentUser}
            onClose={() => setShowJoinRoom(false)}
            onRoomJoined={(room) => {
              setActiveRoom(room);
              setIsMobileSidebarOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
