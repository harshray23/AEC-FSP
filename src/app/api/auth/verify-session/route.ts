
import { verifySession } from '@/lib/auth';
import { db } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('session')?.value || '';
    const decodedClaims = await verifySession(sessionCookie);

    if (!decodedClaims) {
      return NextResponse.json({ message: 'Unauthorized: No valid session found.' }, { status: 401 });
    }

    let userProfile = null;
    const collections = ['students', 'teachers', 'admins', 'hosts'];
    for (const collection of collections) {
      const docRef = db.collection(collection).doc(decodedClaims.uid);
      const doc = await docRef.get();
      if (doc.exists) {
        userProfile = { id: doc.id, ...doc.data() };
        break;
      }
    }

    if (!userProfile) {
        return NextResponse.json({ message: `User profile not found in database for UID: ${decodedClaims.uid}`}, { status: 404 });
    }

    return NextResponse.json({ user: userProfile });

  } catch (error) {
    console.error('Session verification API error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
