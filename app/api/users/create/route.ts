import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { DEFAULT_USER_PERMISSIONS } from '@/lib/types/permissions';

export async function POST(request: NextRequest) {
  try {
    // Verify the caller is an admin
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const callerClaims = await adminAuth.verifyIdToken(idToken);
    if (callerClaims.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { username, nameAr, nameEn, email, phone, password, role } = body;

    if (!username || !nameAr || !nameEn || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check username uniqueness
    const usernameCheck = await adminDb
      .collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();

    if (!usernameCheck.empty) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: nameAr,
    });

    // Set custom claims
    await adminAuth.setCustomUserClaims(userRecord.uid, { role });

    // Create Firestore user document
    const permissions = role === 'admin'
      ? Object.fromEntries(Object.keys(DEFAULT_USER_PERMISSIONS).map((k) => [k, true]))
      : { ...DEFAULT_USER_PERMISSIONS };

    await adminDb.collection('users').doc(userRecord.uid).set({
      username,
      nameAr,
      nameEn,
      email,
      phone: phone || null,
      role,
      isActive: true,
      permissions,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: callerClaims.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: callerClaims.uid,
    });

    return NextResponse.json({ uid: userRecord.uid }, { status: 201 });
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };

    if (firebaseError.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    console.error('User creation error:', firebaseError.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
