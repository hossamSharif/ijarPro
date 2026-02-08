import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const callerClaims = await adminAuth.verifyIdToken(idToken);
    if (callerClaims.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { uid } = await request.json();
    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    // Prevent self-deactivation
    if (uid === callerClaims.uid) {
      return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 });
    }

    // Disable Firebase Auth account
    await adminAuth.updateUser(uid, { disabled: true });

    // Update Firestore document
    await adminDb.collection('users').doc(uid).update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: callerClaims.uid,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('User deactivation error:', (error as { message?: string }).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
