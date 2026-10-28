import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  onIdTokenChanged,
  User,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  waitForPendingWrites,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: Robust Firestore instance initialization with fallback and multi-tab cache
const databaseId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || '(default)';

let firestoreDb: ReturnType<typeof initializeFirestore>;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    databaseId
  );
} catch {
  // If already initialized in module lifecycle
  firestoreDb = getFirestore(app, databaseId);
}

export const db = firestoreDb;
export { waitForPendingWrites };
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { onAuthStateChanged, onIdTokenChanged, signInWithPopup, signOut };
export type { User };

// Proactive Token Refresh Helper
export async function refreshAuthToken(force = false): Promise<string | null> {
  if (!auth.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken(force);
  } catch (err) {
    console.warn('Proactive auth token refresh failed:', err);
    return null;
  }
}

// Error Handling conforming strictly to FirestoreErrorInfo format
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

// Diagnostic connection test - safe to call manually without crashing boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline. Local offline persistence active.');
    }
    return false;
  }
}
