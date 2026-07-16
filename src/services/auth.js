import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as fbSignOut, 
  updateProfile as fbUpdateProfile,
  onAuthStateChanged as fbOnAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, storage, isFirebaseConfigured } from "./firebase";

// Convert file to base64 for local/fallback storage
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// Generates a nice default Dicebear avatar URL based on seed name
const getDefaultAvatar = (seed) => {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
};

/* ==========================================
   MOCK AUTH IMPLEMENTATION (Local Storage)
   ========================================== */

let mockUserListener = null;
let currentMockUser = null;

// Initialize mock session from localStorage
try {
  const saved = localStorage.getItem("chat_app_mock_user");
  if (saved) {
    currentMockUser = JSON.parse(saved);
  }
} catch (e) {
  console.error("Failed to parse mock user:", e);
}

const getMockUsers = () => {
  try {
    const list = localStorage.getItem("chat_app_mock_users_db");
    return list ? JSON.parse(list) : [];
  } catch {
    return [];
  }
};

const saveMockUsers = (users) => {
  localStorage.setItem("chat_app_mock_users_db", JSON.stringify(users));
};

const mockOnAuthStateChanged = (callback) => {
  mockUserListener = callback;
  if (currentMockUser) {
    callback({ ...currentMockUser, emailVerified: true });
  } else {
    callback(null);
  }
  return () => {
    mockUserListener = null;
  };
};

const mockSignUp = async (email, password, displayName, avatarFile) => {
  const users = getMockUsers();
  if (users.find(u => u.email === email)) {
    throw new Error("Email already in use.");
  }

  let photoURL = getDefaultAvatar(displayName || email);
  if (avatarFile) {
    photoURL = await fileToBase64(avatarFile);
  }

  const newUser = {
    uid: "mock_" + Math.random().toString(36).substr(2, 9),
    email,
    displayName: displayName || email.split("@")[0],
    photoURL,
    status: "Exploring rooms...",
    emailVerified: true
  };

  users.push({ ...newUser, password }); // In mock, we store password simply
  saveMockUsers(users);

  currentMockUser = newUser;
  localStorage.setItem("chat_app_mock_user", JSON.stringify(newUser));
  
  if (mockUserListener) mockUserListener(newUser);
  return newUser;
};

const mockSignIn = async (email, password) => {
  const users = getMockUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const authUser = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    status: user.status || "Hey there! I am using Chatify.",
    emailVerified: true
  };

  currentMockUser = authUser;
  localStorage.setItem("chat_app_mock_user", JSON.stringify(authUser));
  
  if (mockUserListener) mockUserListener(authUser);
  return authUser;
};

const mockSignOut = async () => {
  currentMockUser = null;
  localStorage.removeItem("chat_app_mock_user");
  if (mockUserListener) mockUserListener(null);
};

const mockUpdateProfile = async (updates) => {
  if (!currentMockUser) throw new Error("No user is logged in.");

  let photoURL = currentMockUser.photoURL;
  if (updates.avatarFile) {
    photoURL = await fileToBase64(updates.avatarFile);
  }

  const updatedUser = {
    ...currentMockUser,
    displayName: updates.displayName || currentMockUser.displayName,
    photoURL,
    status: updates.status !== undefined ? updates.status : (currentMockUser.status || "")
  };

  // Sync to mock DB
  const users = getMockUsers();
  const index = users.findIndex(u => u.uid === currentMockUser.uid);
  if (index !== -1) {
    users[index] = { ...users[index], ...updatedUser };
    saveMockUsers(users);
  }

  currentMockUser = updatedUser;
  localStorage.setItem("chat_app_mock_user", JSON.stringify(updatedUser));
  if (mockUserListener) mockUserListener(updatedUser);
  return updatedUser;
};

const mockSignInWithGoogle = async () => {
  const mockUser = {
    uid: "mock_google_" + Math.random().toString(36).substr(2, 9),
    email: "google.user@example.com",
    displayName: "Google User",
    photoURL: getDefaultAvatar("Google User"),
    status: "Exploring rooms...",
    emailVerified: true
  };

  const users = getMockUsers();
  if (!users.find(u => u.uid === mockUser.uid)) {
    users.push({ ...mockUser, password: "" });
    saveMockUsers(users);
  }

  currentMockUser = mockUser;
  localStorage.setItem("chat_app_mock_user", JSON.stringify(mockUser));
  if (mockUserListener) mockUserListener(mockUser);
  return mockUser;
};


/* ==========================================
   LIVE FIREBASE AUTH IMPLEMENTATION
   ========================================== */

const liveOnAuthStateChanged = (callback) => {
  return fbOnAuthStateChanged(auth, async (user) => {
    if (user) {
      // In live mode, we also get user custom fields (like status) from localStorage
      // or we can attach it to the auth user. Let's merge standard profile keys.
      let customStatus = "Active";
      try {
        const statuses = JSON.parse(localStorage.getItem("chat_app_fb_statuses") || "{}");
        customStatus = statuses[user.uid] || "Available";
      } catch {}

      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split("@")[0],
        photoURL: user.photoURL || getDefaultAvatar(user.displayName || user.email),
        status: customStatus,
        emailVerified: user.emailVerified
      });
    } else {
      callback(null);
    }
  });
};

const withTimeout = (promise, ms = 2500) => {
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Firebase Storage Upload Timeout")), ms)
  );
  return Promise.race([promise, timeout]);
};

const liveSignUp = async (email, password, displayName, avatarFile) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  let photoURL = getDefaultAvatar(displayName || email);

  if (avatarFile) {
    try {
      // Upload avatar to Firebase Storage if configured
      const storageRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);
      const uploadResult = await withTimeout(uploadBytes(storageRef, avatarFile), 2500);
      photoURL = await getDownloadURL(uploadResult.ref);
    } catch (e) {
      console.warn("Firebase Storage failed, falling back to base64 string photo URL:", e);
      photoURL = await fileToBase64(avatarFile);
    }
  }

  await fbUpdateProfile(user, {
    displayName: displayName || email.split("@")[0],
    photoURL
  });

  try {
    await sendEmailVerification(user);
  } catch (e) {
    console.error("Failed to send verification email:", e);
  }

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    status: "Active",
    emailVerified: user.emailVerified
  };
};

const liveSignIn = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  let customStatus = "Active";
  try {
    const statuses = JSON.parse(localStorage.getItem("chat_app_fb_statuses") || "{}");
    customStatus = statuses[user.uid] || "Available";
  } catch {}

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL || getDefaultAvatar(user.displayName || user.email),
    status: customStatus,
    emailVerified: user.emailVerified
  };
};

const liveSignOut = async () => {
  await fbSignOut(auth);
};

const liveUpdateProfile = async (updates) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user.");

  let photoURL = user.photoURL;

  if (updates.avatarFile) {
    try {
      const storageRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);
      const uploadResult = await withTimeout(uploadBytes(storageRef, updates.avatarFile), 2500);
      photoURL = await getDownloadURL(uploadResult.ref);
    } catch (e) {
      console.warn("Firebase Storage upload failed, updating with base64 data:", e);
      photoURL = await fileToBase64(updates.avatarFile);
    }
  }

  await fbUpdateProfile(user, {
    displayName: updates.displayName || user.displayName,
    photoURL
  });

  // Local storage for custom attributes (status)
  if (updates.status !== undefined) {
    try {
      const statuses = JSON.parse(localStorage.getItem("chat_app_fb_statuses") || "{}");
      statuses[user.uid] = updates.status;
      localStorage.setItem("chat_app_fb_statuses", JSON.stringify(statuses));
    } catch {}
  }

  let finalStatus = updates.status !== undefined ? updates.status : "Active";
  try {
    const statuses = JSON.parse(localStorage.getItem("chat_app_fb_statuses") || "{}");
    finalStatus = statuses[user.uid] || "Active";
  } catch {}

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    status: finalStatus
  };
};

const liveSignInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const user = userCredential.user;
  
  let customStatus = "Active";
  try {
    const statuses = JSON.parse(localStorage.getItem("chat_app_fb_statuses") || "{}");
    customStatus = statuses[user.uid] || "Available";
  } catch {}

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email.split("@")[0],
    photoURL: user.photoURL || getDefaultAvatar(user.displayName || user.email),
    status: customStatus,
    emailVerified: user.emailVerified
  };
};

/* ==========================================
   EXPORT BRIDGED AUTH OPERATIONS
   ========================================== */

export const onAuthStateChanged = isFirebaseConfigured ? liveOnAuthStateChanged : mockOnAuthStateChanged;
export const signUp = isFirebaseConfigured ? liveSignUp : mockSignUp;
export const signIn = isFirebaseConfigured ? liveSignIn : mockSignIn;
export const signOut = isFirebaseConfigured ? liveSignOut : mockSignOut;
export const updateProfile = isFirebaseConfigured ? liveUpdateProfile : mockUpdateProfile;
export const signInWithGoogle = isFirebaseConfigured ? liveSignInWithGoogle : mockSignInWithGoogle;
export { getDefaultAvatar };
