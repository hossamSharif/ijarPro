import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;

  return initializeApp(
    serviceAccount
      ? { credential: cert(serviceAccount as ServiceAccount) }
      : undefined
  );
}

const adminApp = getAdminApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
