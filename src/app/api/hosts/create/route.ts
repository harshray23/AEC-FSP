
import { NextRequest, NextResponse } from 'next/server';
import { db, auth as adminAuth } from '@/lib/firebaseAdmin';
import { USER_ROLES } from '@/lib/constants';
import type { Host } from '@/lib/types';

export async function POST(req: NextRequest) {
  if (!db || !adminAuth) {
    return NextResponse.json({ message: 'Firebase Admin SDK not initialized.' }, { status: 500 });
  }

  const { name, email, password } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ message: 'Missing required fields: name, email, password.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ message: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  try {
    try {
        await adminAuth.getUserByEmail(email);
        return NextResponse.json({ message: `A user with email ${email} already exists in the authentication system.` }, { status: 409 });
    } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
            throw error;
        }
    }

    const userRecord = await adminAuth.createUser({
      email: email,
      password: password,
      displayName: name,
      emailVerified: true,
    });
    
    const uid = userRecord.uid;

    const hostData: Omit<Host, 'id'> = {
      uid,
      name,
      email,
      role: USER_ROLES.HOST,
      status: 'active',
    };
    
    await db.collection('hosts').doc(uid).set(hostData);
    
    const createdUser = { id: uid, ...hostData };

    return NextResponse.json({ message: 'Host user created successfully.', user: createdUser }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating host user:', error);
    return NextResponse.json({ message: error.message || 'Internal server error during host creation.' }, { status: 500 });
  }
}
