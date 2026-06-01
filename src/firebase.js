import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyDD48IX4lTVr_6NjcnD-Aj_GY6ewqAdU_k',
  authDomain: 'edgeabled.firebaseapp.com',
  projectId: 'edgeabled',
  storageBucket: 'edgeabled.firebasestorage.app',
  messagingSenderId: '395134187819',
  appId: '1:395134187819:web:45bbe2c5710025d85f6d6e',
  measurementId: 'G-W383XY2SML',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
