import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA8yJKbmeI4uF3DDfdOxlOYQGvBGIo2kVI",
  authDomain: "interview-e752e.firebaseapp.com",
  projectId: "interview-e752e",
  storageBucket: "interview-e752e.firebasestorage.app",
  messagingSenderId: "1004784786750",
  appId: "1:1004784786750:web:9c0dfa4846f3a49f2ee06f",
  measurementId: "G-VCPXFSWPQ2"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
