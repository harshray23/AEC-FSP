
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database service is not available.' }, { status: 500 });
  }

  const { studentId, email } = await req.json();

  if (!studentId && !email) {
    return NextResponse.json({ message: 'Student ID or Email is required for check.' }, { status: 400 });
  }

  try {
    const studentsRef = db.collection('students');
    
    if (studentId) {
      const idSnapshot = await studentsRef.where('studentId', '==', studentId).limit(1).get();
      if (!idSnapshot.empty) {
        return NextResponse.json({ message: `Student ID ${studentId} already exists.` }, { status: 409 });
      }
    }

    if (email) {
      const emailSnapshot = await studentsRef.where('email', '==', email).limit(1).get();
      if (!emailSnapshot.empty) {
        return NextResponse.json({ message: `Email ${email} already registered.` }, { status: 409 });
      }
    }

    return NextResponse.json({ message: 'Student ID and Email are available.' });

  } catch (error) {
    console.error('Error checking student existence:', error);
    return NextResponse.json({ message: 'Internal server error while checking student existence.' }, { status: 500 });
  }
}
