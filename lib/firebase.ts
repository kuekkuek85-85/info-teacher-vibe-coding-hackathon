import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;

/**
 * 화면이 실제로 그려질 때 초기화한다.
 * 모듈 로드 시점에 만들면 환경 변수가 없는 빌드 단계에서 실패한다.
 */
function getApp(): FirebaseApp {
  if (app) return app;
  app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

export function getDb(): Firestore {
  return getFirestore(getApp());
}

export function getAuthClient(): Auth {
  return getAuth(getApp());
}

function waitForAuth(auth: Auth): Promise<User | null> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

/** 익명 로그인을 보장하고 uid 와 idToken 을 돌려준다. */
export async function ensureAnonAuth(): Promise<{ uid: string; idToken: string }> {
  const auth = getAuthClient();
  let user = await waitForAuth(auth);
  if (!user) user = (await signInAnonymously(auth)).user;
  const idToken = await user.getIdToken();
  return { uid: user.uid, idToken };
}
