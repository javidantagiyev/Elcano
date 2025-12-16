import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries


const firebaseConfig = {
  apiKey: "AIzaSyDF-nBIdFgYbnDGrj2J4_eBKELEHYWDci8",
  authDomain: "elcano-e9926.firebaseapp.com",
  projectId: "elcano-e9926",
  storageBucket: "elcano-e9926.firebasestorage.app",
  messagingSenderId: "568066314394",
  appId: "1:568066314394:web:92a19e65071bf9c75d8f23"
};

if (Object.values(firebaseConfig).some((value) => !value)) {
  throw new Error(
    'Missing Firebase environment variables. Please set all EXPO_PUBLIC_FIREBASE_* keys before running the app.'
  );
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = (() => {
  try {
    return getAuth(app);
  } catch (error) {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
})();
export const db = getFirestore(app);

export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const signOutUser = () => signOut(auth);


