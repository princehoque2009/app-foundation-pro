import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";

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
export const firebaseAuth = getAuth(app);

// Generate stable chat ID
export const generateChatId = (userId1: string, userId2: string): string => {
  return userId1 < userId2 ? `${userId1}_${userId2}` : `${userId2}_${userId1}`;
};

// Phone Auth helpers
let recaptchaVerifier: RecaptchaVerifier | null = null;
let confirmationResult: ConfirmationResult | null = null;

export const setupRecaptcha = (containerId: string): RecaptchaVerifier => {
  // Clear existing verifier if any
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
  
  recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: "invisible",
    callback: () => {
      console.log("[Firebase] reCAPTCHA verified");
    },
    "expired-callback": () => {
      console.log("[Firebase] reCAPTCHA expired");
    }
  });
  
  return recaptchaVerifier;
};

export const sendOTP = async (phoneNumber: string): Promise<ConfirmationResult> => {
  if (!recaptchaVerifier) {
    throw new Error("reCAPTCHA not initialized");
  }
  
  confirmationResult = await signInWithPhoneNumber(firebaseAuth, phoneNumber, recaptchaVerifier);
  return confirmationResult;
};

export const verifyOTP = async (code: string): Promise<any> => {
  if (!confirmationResult) {
    throw new Error("No confirmation result available");
  }
  
  const result = await confirmationResult.confirm(code);
  return result.user;
};

export const clearRecaptcha = () => {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
  confirmationResult = null;
};

export default app;