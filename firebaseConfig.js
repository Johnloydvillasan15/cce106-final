import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
const config = {
  apiKey: "AIzaSyDshsY7fzgQO9CpVZfG22FUzvYkVu2ntI4",
  authDomain: "reactnativesgo.firebaseapp.com",
  projectId: "reactnativesgo",
  storageBucket: "reactnativesgo.firebasestorage.app",
  messagingSenderId: "256900828185",
  appId: "1:256900828185:web:329d8f51484ec3020b6e88",
  measurementId: "G-DRBVT4HKR5"
};
export const isConfigured = !!(
  config.apiKey &&
  config.projectId &&
  config.appId &&
  !config.apiKey.startsWith("YOUR_")
);
let auth = null;
let db = null;
if (isConfigured) {
  const app = getApps().length ? getApp() : initializeApp(config);
  try {
    auth =
      Platform.OS === "web"
        ? getAuth(app)
        : initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage),
          });
  } catch (error) {
    if (error.code !== "auth/already-initialized") throw error;
    auth = getAuth(app);
  }
  db = getFirestore(app);
}
export { auth, db };

