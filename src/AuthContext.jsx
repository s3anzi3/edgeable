import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc, onSnapshot, runTransaction, Timestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase.js';
import {
  normalizeTelegramUsername, normalizePhone,
  isValidTelegramUsername, isValidPhone, lookupAuthEmail,
  normalizeEmail, isValidEmail,
} from './utils/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [docReady, setDocReady] = useState(false);

  // Track the Firebase Auth user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (!user) {
        setUserDoc(null);
        setDocReady(true);
      } else {
        setDocReady(false);
      }
    });
    return unsub;
  }, []);

  // Subscribe to the user's Firestore doc when signed in (live updates)
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(
      doc(db, 'users', currentUser.uid),
      (snap) => {
        setUserDoc(snap.exists() ? snap.data() : null);
        setDocReady(true);
      },
      () => setDocReady(true)
    );
    return unsub;
  }, [currentUser]);

  const login = async (identifier, password) => {
    const authEmail = await lookupAuthEmail(identifier);
    if (!authEmail) {
      const e = new Error('No account found with that username or phone.');
      e.code = 'auth/user-not-found';
      throw e;
    }
    return signInWithEmailAndPassword(auth, authEmail, password);
  };

  const logout = () => signOut(auth);

  const resetPassword = (email) => sendPasswordResetEmail(auth, normalizeEmail(email));

  const signup = async ({ displayName, email, telegramUsername, phone, password }) => {
    const username = normalizeTelegramUsername(telegramUsername);
    const normalizedPhone = normalizePhone(phone);
    const authEmail = normalizeEmail(email);
    const hasUsername = !!username;
    const hasPhone = !!normalizedPhone;

    if (!displayName || !displayName.trim()) throw new Error('Display name is required.');
    if (!isValidEmail(authEmail)) throw new Error('Please enter a valid email address.');
    if (!hasUsername && !hasPhone) {
      throw new Error('Enter your Telegram username or phone number.');
    }
    if (hasUsername && !isValidTelegramUsername(username)) {
      throw new Error('Telegram username must be 5-32 chars, letters/digits/underscore only.');
    }
    if (hasPhone && !isValidPhone(normalizedPhone)) {
      throw new Error('Phone must be 7-15 digits.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    // The real email IS the Firebase Auth account email — this is what makes the
    // free built-in password-reset emails work. Telegram/phone remain login aliases
    // that resolve to this email via the lookup docs below.
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(auth, authEmail, password);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('That email is already registered. Try signing in instead.');
      }
      throw err;
    }
    const uid = cred.user.uid;

    try {
      await runTransaction(db, async (txn) => {
        const userRef = doc(db, 'users', uid);
        const usernameRef = hasUsername ? doc(db, 'usernames', username) : null;
        const phoneRef = hasPhone ? doc(db, 'phones', normalizedPhone) : null;

        // Reads first (transactions require all reads before writes).
        if (usernameRef) {
          const unameSnap = await txn.get(usernameRef);
          if (unameSnap.exists()) throw new Error('That Telegram username is already taken.');
        }
        if (phoneRef) {
          const phoneSnap = await txn.get(phoneRef);
          if (phoneSnap.exists()) throw new Error('That phone number is already registered.');
        }

        txn.set(userRef, {
          displayName: displayName.trim(),
          email: authEmail,
          authEmail,
          telegramUsername: hasUsername ? username : '',
          phone: hasPhone ? normalizedPhone : '',
          role: 'user',
          status: 'inactive',
          createdAt: Timestamp.fromDate(new Date()),
        });
        if (usernameRef) txn.set(usernameRef, { uid, authEmail });
        if (phoneRef) txn.set(phoneRef, { uid, authEmail });
      });
    } catch (err) {
      try { await cred.user.delete(); } catch {}
      if (err.code === 'permission-denied') {
        throw new Error('Could not create your account. Please try again or contact the admin.');
      }
      throw err;
    }
  };

  const role = userDoc?.role ?? null;
  const loading = !authReady || (currentUser && !docReady);

  return (
    <AuthContext.Provider value={{ currentUser, userDoc, role, loading, login, logout, signup, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
