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
import VerifyEmailScreen from "./components/VerifyEmailScreen";
import { MessageSquare } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const hasAutoSelectedRef = useRef(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
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
        hasAutoSelectedRef.current = false;
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
      
      // Auto-select general or first room on initial load (desktop only)
      if (sorted.length > 0 && !hasAutoSelectedRef.current) {
        if (window.innerWidth > 768) {
          const general = sorted.find(r => r.id === "room_general") || sorted[0];
          setActiveRoom(general);
        }
        hasAutoSelectedRef.current = true;
      }
    });

    return () => unsubscribe();
  }, [currentUser]);



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

  // Email Verification Gate (Live Firebase Mode Only)
  if (isFirebaseConfigured && currentUser && !currentUser.emailVerified) {
    return <VerifyEmailScreen currentUser={currentUser} onVerified={setCurrentUser} />;
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
        {(!isMobile || !activeRoom) && (
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
        )}

        {(!isMobile || activeRoom) && (
          <ChatArea
            activeRoom={activeRoom}
            currentUser={currentUser}
            onToggleSidebar={() => setIsMobileSidebarOpen(true)}
            onBackToList={() => setActiveRoom(null)}
            isMobile={isMobile}
            usersInRoom={onlineUsers.filter(u => u.currentRoomId === activeRoom?.id)}
            onLeaveRoom={handleLeaveRoom}
          />
        )}

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
