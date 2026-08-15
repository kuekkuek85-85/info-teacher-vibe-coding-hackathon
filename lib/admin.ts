import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | null = null;

/**
 * 서비스 계정 키를 어떤 모양으로 붙여넣어도 읽히게 만든다.
 * 환경 변수 화면에 따옴표째 넣는 실수가 흔하고, 줄바꿈은 \n 으로 들어온다.
 */
function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw.trim().replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
}

/**
 * 요청이 들어올 때 초기화한다.
 * 모듈 로드 시점에 초기화하면 환경 변수가 없는 빌드 단계에서 실패한다.
 */
function getAdminApp(): App {
  if (app) return app;
  app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
      }),
    });
  return app;
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
