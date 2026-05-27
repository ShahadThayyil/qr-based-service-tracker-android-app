// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// 🔥 Import Auth and updated Firestore functions
import { getAuth } from "firebase/auth";
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBZOrBJBMkHc6G2ds1t1x_BLW8M8gEPoHo",
  authDomain: "techno-service-manager.firebaseapp.com",
  projectId: "techno-service-manager",
  storageBucket: "techno-service-manager.firebasestorage.app",
  messagingSenderId: "619244027739",
  appId: "1:619244027739:web:74ad5dd385c66b4a91a47e",
  measurementId: "G-NPCFPSSY1P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 🔥 Initialize and Export Auth
export const auth = getAuth(app);

// 🚀 THE MAGIC FIX: Force Long Polling to bypass Capacitor offline errors
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

export default app;