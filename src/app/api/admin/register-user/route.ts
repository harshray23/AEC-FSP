
import { NextRequest, NextResponse } from 'next/server';
import { db, auth as adminAuth } from '@/lib/firebaseAdmin';
import { USER_ROLES } from '@/lib/constants';
import type { Admin, Teacher } from '@/lib/types';

export async function POST(req: NextRequest) {
  if (!db || !adminAuth) {
    return NextResponse.json({ message: 'Firebase Admin SDK not initialized.' }, { status: 500 });
  }

  const { name, email, role, department, password } = await req.json();

  if (!name || !email || !role || !password) {
    return NextResponse.json({ message: 'Missing required fields: name, email, role, password.' }, { status: 400 });
  }
  if (role === USER_ROLES.TEACHER && !department) {
    return NextResponse.json({ message: 'Department is required for teacher role.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ message: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  try {
    // Step 1: Check if a user with this email already exists in Firestore or Auth
    const teacherQuery = await db.collection('teachers').where('email', '==', email).limit(1).get();
    const adminQuery = await db.collection('admins').where('email', '==', email).limit(1).get();
    if (!teacherQuery.empty || !adminQuery.empty) {
      return NextResponse.json({ message: `A user with email ${email} already exists.` }, { status: 409 });
    }
    
    try {
        await adminAuth.getUserByEmail(email);
        return NextResponse.json({ message: `A user with email ${email} already exists in the authentication system.` }, { status: 409 });
    } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
            throw error;
        }
    }

    // Step 2: Create user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email: email,
      password: password,
      displayName: name,
      emailVerified: true,
    });
    
    const uid = userRecord.uid;

    // Step 3: Create user profile in Firestore with "pending_approval" status
    let collectionName: string;
    let userData: Omit<Admin, 'id'> | Omit<Teacher, 'id'>;

    if (role === USER_ROLES.TEACHER) {
      collectionName = 'teachers';
      const teacherData: Omit<Teacher, 'id'> = {
        uid,
        name,
        email,
        role: USER_ROLES.TEACHER,
        department,
        status: "pending_approval",
      };
      userData = teacherData;

    } else if (role === USER_ROLES.ADMIN) {
      collectionName = 'admins';
       const adminData: Omit<Admin, 'id'> = {
        uid,
        name,
        email,
        role: USER_ROLES.ADMIN,
        status: "pending_approval",
      };
      userData = adminData;

    } else {
      await adminAuth.deleteUser(uid);
      return NextResponse.json({ message: 'Invalid user role specified.' }, { status: 400 });
    }

    await db.collection(collectionName).doc(uid).set(userData);
    
    const createdUser = { id: uid, ...userData };
    const message = `${role} registered successfully and awaiting approval.`;
      
    return NextResponse.json({ message, user: createdUser }, { status: 201 });

  } catch (error: any) {
    console.error('Error during user registration by admin:', error);
    return NextResponse.json({ message: error.message || 'Internal server error during registration.' }, { status: 500 });
  }
}
