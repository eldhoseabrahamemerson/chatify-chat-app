import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  doc,
  setDoc,
  where,
  getDocs,
  updateDoc,
  arrayUnion
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, isFirebaseConfigured } from "./firebase";

// Convert file to base64 for local storage (mock image upload)
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/* ==========================================
   MOCK FIREBASE FIRESTORE & STORAGE (LocalStorage)
   ========================================== */

const mockListeners = {
  rooms: [],
  messages: {} // roomId -> callback[]
};

const getMockRooms = () => {
  try {
    const rooms = localStorage.getItem("chat_app_mock_rooms");
    return rooms ? JSON.parse(rooms) : [
      {
        id: "room_general",
        name: "General Discussion",
        description: "The main room for general chats, hanging out, and meeting people.",
        createdAt: Date.now() - 3600000 * 24, // 1 day ago
        createdBy: "System"
      },
      {
        id: "room_react",
        name: "React & Vite developers",
        description: "Talk code, share tips, and showcase your cool React/Vite builds here.",
        createdAt: Date.now() - 3600000 * 12, // 12 hours ago
        createdBy: "System"
      }
    ];
  } catch {
    return [];
  }
};

const saveMockRooms = (rooms) => {
  localStorage.setItem("chat_app_mock_rooms", JSON.stringify(rooms));
};

const getMockMessages = (roomId) => {
  try {
    const key = `chat_app_mock_messages_${roomId}`;
    const msgs = localStorage.getItem(key);
    return msgs ? JSON.parse(msgs) : [
      {
        id: `msg_welcome_${roomId}`,
        text: `Welcome to the ${roomId.replace("room_", "").toUpperCase()} room! Say hello and start chatting.`,
        senderId: "system",
        senderName: "Chat Bot",
        senderAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=system",
        createdAt: Date.now() - 300000
      }
    ];
  } catch {
    return [];
  }
};

const saveMockMessages = (roomId, messages) => {
  localStorage.setItem(`chat_app_mock_messages_${roomId}`, JSON.stringify(messages));
};

const mockSubscribeToRooms = (user, callback) => {
  const emitRooms = (roomsList) => {
    const filtered = roomsList.filter(room => 
      !room.isPrivate || 
      room.creatorId === user.uid || 
      (room.members && room.members.includes(user.uid))
    );
    callback(filtered);
  };
  
  mockListeners.rooms.push(emitRooms);
  emitRooms(getMockRooms());

  return () => {
    mockListeners.rooms = mockListeners.rooms.filter(cb => cb !== emitRooms);
  };
};

const mockCreateRoom = async (name, description, creator, isPrivate = false, inviteCode = "") => {
  const rooms = getMockRooms();
  const newRoom = {
    id: "room_" + Math.random().toString(36).substr(2, 9),
    name,
    description: description || "No description provided.",
    createdAt: Date.now(),
    createdBy: creator.displayName,
    creatorId: creator.uid,
    isPrivate,
    inviteCode: isPrivate ? inviteCode.trim().toUpperCase() : "",
    members: [creator.uid]
  };
  rooms.push(newRoom);
  saveMockRooms(rooms);

  // Notify active listeners
  mockListeners.rooms.forEach(cb => cb(getMockRooms()));
  return newRoom;
};

const mockSubscribeToMessages = (roomId, callback) => {
  if (!mockListeners.messages[roomId]) {
    mockListeners.messages[roomId] = [];
  }
  mockListeners.messages[roomId].push(callback);
  callback(getMockMessages(roomId));

  return () => {
    mockListeners.messages[roomId] = mockListeners.messages[roomId].filter(cb => cb !== callback);
  };
};

const mockSendMessage = async (roomId, text, imageFile, sender) => {
  const messages = getMockMessages(roomId);
  let imageUrl = null;

  if (imageFile) {
    imageUrl = await fileToBase64(imageFile);
  }

  const newMessage = {
    id: "msg_" + Math.random().toString(36).substr(2, 9),
    text: text || "",
    imageUrl,
    senderId: sender.uid,
    senderName: sender.displayName,
    senderAvatar: sender.photoURL,
    createdAt: Date.now()
  };

  messages.push(newMessage);
  saveMockMessages(roomId, messages);

  // Notify listeners of this room
  if (mockListeners.messages[roomId]) {
    mockListeners.messages[roomId].forEach(cb => cb(messages));
  }
  
  // Also trigger a room list update so that the room list shows the updated timestamp or last message preview
  mockListeners.rooms.forEach(cb => cb(getMockRooms()));

  return newMessage;
};

const mockJoinRoomWithCode = async (inviteCode, user) => {
  const rooms = getMockRooms();
  const roomIndex = rooms.findIndex(r => r.isPrivate && r.inviteCode === inviteCode.trim().toUpperCase());
  
  if (roomIndex === -1) {
    throw new Error("No room found with this invite code.");
  }
  
  const room = rooms[roomIndex];
  if (!room.members) {
    room.members = [];
  }
  
  if (!room.members.includes(user.uid)) {
    room.members.push(user.uid);
    rooms[roomIndex] = room;
    saveMockRooms(rooms);
    // Notify active listeners
    mockListeners.rooms.forEach(cb => cb(getMockRooms()));
  }
  
  return room;
};


/* ==========================================
   LIVE FIREBASE FIRESTORE & STORAGE IMPLEMENTATION
   ========================================== */

const liveSubscribeToRooms = (user, callback) => {
  const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const rooms = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toMillis() || Date.now()
    }));
    
    // Filter private rooms in-memory
    const filtered = rooms.filter(room => 
      !room.isPrivate || 
      room.creatorId === user.uid || 
      (room.members && room.members.includes(user.uid))
    );
    
    callback(filtered);
  }, (error) => {
    console.error("Error subscribing to rooms:", error);
  });
};

const liveCreateRoom = async (name, description, creator, isPrivate = false, inviteCode = "") => {
  const roomData = {
    name,
    description: description || "",
    createdAt: serverTimestamp(),
    createdBy: creator.displayName,
    creatorId: creator.uid,
    isPrivate,
    inviteCode: isPrivate ? inviteCode.trim().toUpperCase() : "",
    members: [creator.uid]
  };
  const docRef = await addDoc(collection(db, "rooms"), roomData);
  return {
    id: docRef.id,
    ...roomData,
    createdAt: Date.now()
  };
};

const liveSubscribeToMessages = (roomId, callback) => {
  const messagesRef = collection(db, "rooms", roomId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toMillis() || Date.now()
    }));
    callback(messages);
  }, (error) => {
    console.error("Error subscribing to messages:", error);
  });
};

const withTimeout = (promise, ms = 2500) => {
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Firebase Storage Upload Timeout")), ms)
  );
  return Promise.race([promise, timeout]);
};

const liveSendMessage = async (roomId, text, imageFile, sender) => {
  let imageUrl = null;

  if (imageFile) {
    try {
      const storageRef = ref(storage, `chat_images/${roomId}/${Date.now()}_${imageFile.name}`);
      const uploadResult = await withTimeout(uploadBytes(storageRef, imageFile), 2500);
      imageUrl = await getDownloadURL(uploadResult.ref);
    } catch (e) {
      console.warn("Storage upload failed or timed out, falling back to base64 serialization:", e);
      imageUrl = await fileToBase64(imageFile);
    }
  }

  const messagesRef = collection(db, "rooms", roomId, "messages");
  await addDoc(messagesRef, {
    text: text || "",
    imageUrl,
    senderId: sender.uid,
    senderName: sender.displayName,
    senderAvatar: sender.photoURL,
    createdAt: serverTimestamp()
  });
};

const liveJoinRoomWithCode = async (inviteCode, user) => {
  const roomsRef = collection(db, "rooms");
  const q = query(roomsRef, where("isPrivate", "==", true), where("inviteCode", "==", inviteCode.trim().toUpperCase()));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    throw new Error("No room found with this invite code.");
  }
  
  const roomDoc = snapshot.docs[0];
  const roomData = roomDoc.data();
  
  if (!roomData.members || !roomData.members.includes(user.uid)) {
    const docRef = doc(db, "rooms", roomDoc.id);
    await updateDoc(docRef, {
      members: arrayUnion(user.uid)
    });
  }
  
  return {
    id: roomDoc.id,
    ...roomData,
    members: roomData.members ? [...roomData.members, user.uid] : [user.uid]
  };
};


/* ==========================================
   PRESENCE & ONLINE USER TRACKING
   ========================================== */

const mockSubscribeToOnlineUsers = (callback) => {
  const getOnlineList = () => {
    try {
      const mockUsersDb = JSON.parse(localStorage.getItem("chat_app_mock_users_db") || "[]");
      const currentMock = JSON.parse(localStorage.getItem("chat_app_mock_user"));
      
      const list = mockUsersDb.map(u => ({
        uid: u.uid,
        displayName: u.displayName,
        photoURL: u.photoURL,
        status: u.status || "online",
        currentRoomId: u.currentRoomId || null,
        lastActive: u.lastActive || Date.now()
      }));

      if (currentMock && !list.find(u => u.uid === currentMock.uid)) {
        list.push({ 
          ...currentMock, 
          status: "online", 
          currentRoomId: currentMock.currentRoomId || null,
          lastActive: Date.now() 
        });
      }

      // Add bots with static mock room presence
      list.push({
        uid: "bot_1",
        displayName: "Sarah Coder",
        photoURL: "https://api.dicebear.com/7.x/adventurer/svg?seed=sarah",
        status: "online",
        currentRoomId: "room_react",
        lastActive: Date.now()
      });
      list.push({
        uid: "bot_2",
        displayName: "Alex Dev",
        photoURL: "https://api.dicebear.com/7.x/adventurer/svg?seed=alex",
        status: "online",
        currentRoomId: "room_general",
        lastActive: Date.now()
      });

      return list;
    } catch {
      return [];
    }
  };

  callback(getOnlineList());
  const interval = setInterval(() => callback(getOnlineList()), 5000);
  return () => clearInterval(interval);
};

const mockUpdateUserPresence = async (user, status, currentRoomId = null) => {
  if (user) {
    try {
      const updated = { 
        ...user, 
        status: status === "online" ? "Active" : "Offline",
        currentRoomId 
      };
      localStorage.setItem("chat_app_mock_user", JSON.stringify(updated));
      
      let mockUsersDb = [];
      try {
        mockUsersDb = JSON.parse(localStorage.getItem("chat_app_mock_users_db") || "[]");
      } catch {}
      
      const userIndex = mockUsersDb.findIndex(u => u.uid === user.uid);
      const userPresenceInfo = {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        status: status,
        currentRoomId,
        lastActive: Date.now()
      };
      
      if (userIndex > -1) {
        mockUsersDb[userIndex] = userPresenceInfo;
      } else {
        mockUsersDb.push(userPresenceInfo);
      }
      localStorage.setItem("chat_app_mock_users_db", JSON.stringify(mockUsersDb));
    } catch (e) {
      console.error(e);
    }
  }
};

const liveUpdateUserPresence = async (user, status, currentRoomId = null) => {
  if (!user) return;
  try {
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      displayName: user.displayName || user.email.split("@")[0],
      photoURL: user.photoURL || "",
      status: status,
      currentRoomId: currentRoomId,
      lastActive: Date.now()
    }, { merge: true });
  } catch (e) {
    console.error("Failed to update user presence:", e);
  }
};

const liveSubscribeToOnlineUsers = (callback) => {
  const q = collection(db, "users");
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => doc.data());
    const activeTimeLimit = Date.now() - 90 * 1000;
    const onlineUsers = users.filter(u => u.status === "online" && u.lastActive > activeTimeLimit);
    callback(onlineUsers);
  }, (error) => {
    console.error("Error subscribing to users for presence:", error);
  });
};

/* ==========================================
   EXPORT BRIDGED FIRESTORE OPERATIONS
   ========================================== */

export const subscribeToRooms = isFirebaseConfigured ? liveSubscribeToRooms : mockSubscribeToRooms;
export const createRoom = isFirebaseConfigured ? liveCreateRoom : mockCreateRoom;
export const subscribeToMessages = isFirebaseConfigured ? liveSubscribeToMessages : mockSubscribeToMessages;
export const sendMessage = isFirebaseConfigured ? liveSendMessage : mockSendMessage;
export const subscribeToOnlineUsers = isFirebaseConfigured ? liveSubscribeToOnlineUsers : mockSubscribeToOnlineUsers;
export const updateUserPresence = isFirebaseConfigured ? liveUpdateUserPresence : mockUpdateUserPresence;
export const joinRoomWithCode = isFirebaseConfigured ? liveJoinRoomWithCode : mockJoinRoomWithCode;
