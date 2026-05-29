// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// 🔥 Import Auth and updated Firestore functions
import { getAuth } from "firebase/auth";
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDmc5dhOeWGkj9CqMmb1yVbydfhiKNmndw",
  authDomain: "service-manager-techno.firebaseapp.com",
  projectId: "service-manager-techno",
  storageBucket: "service-manager-techno.firebasestorage.app",
  messagingSenderId: "30003044240",
  appId: "1:30003044240:web:1ce6ef70c9ab578da39d15",
  measurementId: "G-9CHG3GK4NN"
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