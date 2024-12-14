// src/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database'; // Import Realtime Database

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyC2VQI71tyH5Fy_9RfLnmEpLM5ZDl3pDtM',
  authDomain: 'pt101chatapp.firebaseapp.com',
  databaseURL:
    'https://pt101chatapp-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'pt101chatapp',
  storageBucket: 'pt101chatapp.appspot.com',
  messagingSenderId: '682720758549',
  appId: '1:682720758549:web:8387f2744b2900f447371c',
  measurementId: 'G-KG6RYR3PVN',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const realtimeDb = getDatabase(app); // Initialize Realtime Database

export { auth, db, storage, realtimeDb };
