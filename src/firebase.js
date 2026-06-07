import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
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

// App Check — abuse/rate-limit protection. Verifies traffic comes from the real
// app via reCAPTCHA Enterprise before it reaches Auth/Firestore/Storage/Functions.
// Inert until VITE_APPCHECK_RECAPTCHA_KEY is set, so this is safe to ship as-is.
// For local dev against an enforced backend, set VITE_APPCHECK_DEBUG_TOKEN=true
// and register the printed debug token in the Firebase console.
const appCheckKey = import.meta.env.VITE_APPCHECK_RECAPTCHA_KEY;
if (appCheckKey) {
  if (import.meta.env.VITE_APPCHECK_DEBUG_TOKEN) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
