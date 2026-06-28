import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA8yJKbmeI4uF3DDfdOxlOYQGvBGIo2kVI",
  authDomain: "interview-e752e.firebaseapp.com",
  projectId: "interview-e752e",
  storageBucket: "interview-e752e.firebasestorage.app",
  messagingSenderId: "1004784786750",
  appId: "1:1004784786750:web:9c0dfa4846f3a49f2ee06f",
  measurementId: "G-VCPXFSWPQ2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    const userRef = doc(db, 'users', 'test-uid');
    const snap = await getDoc(userRef);
    console.log("Success:", snap.exists());
  } catch (err) {
    console.error("Firestore Error:", err.message);
  }
}
test();
