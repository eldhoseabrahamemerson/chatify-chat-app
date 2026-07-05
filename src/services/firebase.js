import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Determine if user has set up custom Firebase config keys
const isFirebaseConfigured = 
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_API_KEY !== "your_api_key_here" && 
  import.meta.env.VITE_FIREBASE_PROJECT_ID && 
  import.meta.env.VITE_FIREBASE_PROJECT_ID !== "your_project_id_here";

let app;
let auth = null;
let db = null;
let storage = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("Firebase initialized successfully. Running in Live Mode.");
  } catch (error) {
    console.error("Firebase initialization failed, falling back to Mock Mode:", error);
  }
} else {
  console.log("No Firebase configuration keys found. Running in Mock Demo Mode.");
}

export { auth, db, storage, isFirebaseConfigured };
