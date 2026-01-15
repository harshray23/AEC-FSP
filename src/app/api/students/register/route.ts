
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import type { Student } from '@/lib/types';
import { USER_ROLES } from '@/lib/constants';

export async function POST(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
  }

  const {
    uid,
    studentId,
    name,
    email,
    rollNumber,
    registrationNumber,
    department,
    phoneNumber,
    whatsappNumber,
    admissionYear,
    currentYear,
  } = await req.json() as Partial<Student & { password?: string }>;

  if (!studentId || !name || !email || !rollNumber || !registrationNumber || !department || !phoneNumber || !admissionYear || !currentYear) {
    return NextResponse.json({ message: 'Missing required student registration fields.' }, { status: 400 });
  }
  if (!uid) {
    return NextResponse.json({ message: 'Firebase User ID (uid) is required.' }, { status: 400 });
  }


  try {
    const studentsRef = db.collection('students');

    const existingByIdQuery = await studentsRef.where('studentId', '==', studentId).limit(1).get();
    if (!existingByIdQuery.empty) {
      return NextResponse.json({ message: `Student ID ${studentId} already exists.` }, { status: 409 });
    }
    const existingByEmailQuery = await studentsRef.where('email', '==', email).limit(1).get();
    if (!existingByEmailQuery.empty && existingByEmailQuery.docs[0].id !== uid) {
      return NextResponse.json({ message: `Email ${email} already registered to a different user.` }, { status: 409 });
    }
    const existingDoc = await studentsRef.doc(uid).get();
    if (existingDoc.exists) {
        return NextResponse.json({ message: `A user profile with UID ${uid} already exists.` }, { status: 409 });
    }

    const newStudentData: Omit<Student, 'id'> = {
      uid,
      studentId,
      name,
      email,
      role: USER_ROLES.STUDENT,
      rollNumber,
      registrationNumber,
      department,
      phoneNumber,
      isEmailVerified: true, 
      isPhoneVerified: true,
      status: 'active',
      admissionYear,
      currentYear,
    };
    
    if (whatsappNumber) {
        newStudentData.whatsappNumber = whatsappNumber;
    }

    await studentsRef.doc(uid).set(newStudentData);
    
    const createdStudent = { id: uid, ...newStudentData };

    return NextResponse.json({ message: 'Student registered successfully', student: createdStudent }, { status: 201 });

  } catch (error) {
    console.error('Error during student registration:', error);
    return NextResponse.json({ message: 'Internal server error during registration.' }, { status: 500 });
  }
}
