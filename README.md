# Chatify — Premium Real-Time Chat Rooms

Chatify is a sleek, modern, real-time multi-room chat application built using **React (Vite)**, **Firebase**, and **Vanilla CSS**. It features a glassmorphic dark theme, real-time messaging, file sharing, custom profile updates, and active user presence tracking.

To enable instant verification, Chatify is designed with a **Dual-Mode Architecture**:
1. **Mock Mode (Default)**: Automatically writes and subscribes to in-browser storage (ideal for offline testing and immediate previews without setup).
2. **Firebase Live Mode**: Activated automatically when valid environment variables are supplied in a `.env` file, connecting directly to Cloud Firestore and Firebase Authentication.

---

## Key Features

- 💬 **Multi-Room Conversations**: Create separate public rooms/channels dynamically. Real-time updates push new channels to all users instantly.
- ⚡ **Real-Time Sync**: Instant message delivery powered by Cloud Firestore's `onSnapshot` queries.
- 🟢 **Heartbeat Presence System**: Shows who is currently online in the active chat room and in a dedicated sidebar list. Uses a client-side heartbeat to prune idle users and closed tabs within 90 seconds.
- 📸 **Image sharing & Attachments**: Send text messages along with image files. If Firebase Storage is offline, the app compresses and encodes files into base64 format transparently.
- 😀 **Custom Emoji Drawer**: In-app emoji picker to add reactions easily without bloated external libraries.
- ⚙️ **Profile Customization**: Click the gear icon to change your Username, upload custom avatars, or set custom status slogans (e.g., "Coding...").
- 🔒 **Resilient Free-Tier Guards**: Implements an automatic client-side 800KB size check on uploads to fit standard free-tier database thresholds and prevent Firestore document overflows.

---

## Tech Stack

- **Frontend Framework**: React 18+ (Vite)
- **Database & Sync**: Cloud Firestore
- **Authentication**: Firebase Authentication (Email/Password)
- **Asset Storage**: Firebase Storage (with Base64 Firestore fallbacks for Spark free-tier limits)
- **Styling**: Vanilla CSS (Custom design variables, Glassmorphism, animations, responsive grid/flex layout)
- **Icons**: Lucide React

---

## File Structure

```text
├── src/
│   ├── assets/          # Base Vite and React image vectors
│   ├── components/      # UI components
│   │   ├── AuthScreen.jsx      # Login and Sign-Up panels
│   │   ├── Sidebar.jsx         # User profile, search, rooms, and online list
│   │   ├── ChatArea.jsx        # Room header, message feed, and input tools
│   │   ├── CreateRoomModal.jsx # Room creation dialog
│   │   └── SettingsModal.jsx   # Profile modification overlay
│   ├── services/        # Firebase configuration and mock database bridges
│   │   ├── firebase.js         # Firebase App configuration
│   │   ├── auth.js             # Authentication service wrapper
│   │   └── db.js               # Firestore operations wrapper
│   ├── App.jsx          # Root component & presence coordinator
│   ├── index.css        # Visual design variables and styles
│   └── main.jsx         # DOM entrypoint
├── .env.example         # Template for Firebase credentials
├── index.html           # Main HTML document
├── package.json         # Dependencies and scripts
└── README.md            # Documentation
```

---

## Getting Started

### 1. Installation
Clone the repository, navigate to the folder, and install package dependencies:
```bash
npm install
```

### 2. Run the Development Server
Launch the local dev environment:
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** to preview the application in Mock Mode.

### 3. Connect to Live Firebase
1. Rename `.env.example` in the project root to `.env`.
2. Open the [Firebase Console](https://console.firebase.google.com/) and create a new project.
3. Register a new **Web App** on your dashboard and copy the `firebaseConfig` keys.
4. Fill in the keys inside your `.env` file:
   ```env
   VITE_FIREBASE_API_KEY=your_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_domain_here
   VITE_FIREBASE_PROJECT_ID=your_project_id_here
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
   VITE_FIREBASE_APP_ID=your_app_id_here
   ```
5. In your Firebase Console sidebar, enable:
   - **Authentication**: Turn on the `Email/Password` provider.
   - **Cloud Firestore**: Initialize in `Test Mode`.
6. Restart your development server. The "Mock Mode" banner will disappear, and the app will sync live to the cloud database!

### 4. Build for Production
To bundle the application for hosting:
```bash
npm run build
```

---

## Deployment (Firebase Hosting)

To deploy your built app to Firebase's global CDN:
1. Install the Firebase CLI: `npm install -g firebase-tools`
2. Authenticate: `firebase login`
3. Initialize: `firebase init hosting`
   - Select **Use an existing project** (pick your project).
   - Enter `dist` as the public directory.
   - Configure as single-page app: `y`.
   - Setup automatic builds: `n`.
4. Deploy: `firebase deploy`

---

## License

This project is open-source and available under the [MIT License](LICENSE).
