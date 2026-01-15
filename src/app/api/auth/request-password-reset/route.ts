
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { USER_ROLES, type UserRole } from '@/lib/constants';

export async function POST(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database not initialized.' }, { status: 500 });
  }

  const { email, role } = await req.json() as { email?: string; role?: UserRole };

  if (!email || !role) {
    return NextResponse.json({ message: 'Email and role are required.' }, { status: 400 });
  }

  try {
    let collectionName: string;
    switch (role) {
      case USER_ROLES.STUDENT: collectionName = 'students'; break;
      case USER_ROLES.TEACHER: collectionName = 'teachers'; break;
      case USER_ROLES.ADMIN: collectionName = 'admins'; break;
      case USER_ROLES.HOST: 
        collectionName = 'hosts';
        break;
      default:
        return NextResponse.json({ message: 'Invalid user role specified.' }, { status: 400 });
    }

    const query = db.collection(collectionName).where('email', '==', email).limit(1);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return NextResponse.json({ message: `No active user found with email ${email} for the role ${role}.` }, { status: 404 });
    }

    if (role === USER_ROLES.TEACHER || role === USER_ROLES.ADMIN) {
        const user = snapshot.docs[0].data();
        if (user.status !== 'active') {
             return NextResponse.json({ message: `User account is not active.` }, { status: 403 });
        }
    }
    
    return NextResponse.json({ message: 'User verified successfully.' });

  } catch (error) {
    console.error("Error in password reset request:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
