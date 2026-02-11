import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

const app = initializeApp(
  serviceAccount
    ? { credential: cert(serviceAccount as ServiceAccount) }
    : undefined
);

const auth = getAuth(app);
const db = getFirestore(app);

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@ijar.pro';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456';

  console.log(`Creating admin user: ${email}`);

  // Create Firebase Auth user
  let user;
  try {
    user = await auth.createUser({
      email,
      password,
      displayName: 'مدير النظام',
    });
    console.log(`Auth user created: ${user.uid}`);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'auth/email-already-exists') {
      user = await auth.getUserByEmail(email);
      console.log(`Auth user already exists: ${user.uid}`);
    } else {
      throw error;
    }
  }

  // Set custom claims
  await auth.setCustomUserClaims(user.uid, { role: 'admin' });
  console.log('Custom claims set: { role: "admin" }');

  // Create Firestore user document
  const now = Timestamp.now();
  await db.collection('users').doc(user.uid).set({
    username: 'admin',
    nameAr: 'مدير النظام',
    nameEn: 'System Admin',
    email,
    role: 'admin',
    isActive: true,
    permissions: {
      canCreateInvoice: true,
      canUpdateInvoice: true,
      canCancelInvoice: true,
      canRecordPayment: true,
      canManageBuildings: true,
      canManageCustomers: true,
      canAddExpense: true,
      canViewJournal: true,
      canCreateManualEntry: true,
      canViewReports: true,
      canChangeOwnPassword: true,
    },
    createdAt: now,
    createdBy: 'system',
    updatedAt: now,
    updatedBy: 'system',
  }, { merge: true });

  console.log('Firestore user document created');
  console.log('Admin seeding complete!');
}

seedAdmin().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
