import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, onValue, set, push, update, remove, off, serverTimestamp, get } from 'firebase/database';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
console.log("Initializing Firebase with config:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
let dbInstance;
try {
  // Try default initialization
  dbInstance = getDatabase(app);
} catch (e) {
  console.warn("Default database initialization failed, trying with constructed URL");
  const databaseURL = `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`;
  dbInstance = getDatabase(app, databaseURL);
}
export const db = dbInstance;

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Auth helpers
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleDatabaseError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Database Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { onAuthStateChanged, ref, onValue, set, push, update, remove, off, serverTimestamp, get };
