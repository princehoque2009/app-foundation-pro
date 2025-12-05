import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCQ5qBEmXMyKkudaGiiZHMSMArCwprhPpg",
  authDomain: "prangon-official.firebaseapp.com",
  databaseURL: "https://prangon-official-default-rtdb.firebaseio.com",
  projectId: "prangon-official",
  storageBucket: "prangon-official.firebasestorage.app",
  messagingSenderId: "183437633568",
  appId: "1:183437633568:web:37e46cf2b26bc71fa87445"
};

const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);
export const firebaseStorage = getStorage(app);

// Generate stable chat ID
export const generateChatId = (userId1: string, userId2: string): string => {
  return userId1 < userId2 ? `${userId1}_${userId2}` : `${userId2}_${userId1}`;
};

export default app;
