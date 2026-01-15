
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin'; 
import type { Student } from '@/lib/types';

export async function GET(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const studentIdentifier = searchParams.get('studentId');

  if (!studentIdentifier) {
    return NextResponse.json({ message: 'Student ID or UID is required as a query parameter.' }, { status: 400 });
  }

  try {
    const studentsRef = db.collection('students');
    let studentDocSnapshot;

    const uidQuerySnapshot = await studentsRef.where('uid', '==', studentIdentifier).limit(1).get();

    if (!uidQuerySnapshot.empty) {
      studentDocSnapshot = uidQuerySnapshot.docs[0];
    } else {
      const studentIdFieldQuerySnapshot = await studentsRef.where('studentId', '==', studentIdentifier).limit(1).get();
      if (!studentIdFieldQuerySnapshot.empty) {
        studentDocSnapshot = studentIdFieldQuerySnapshot.docs[0];
      } else {
        try {
          const doc = await studentsRef.doc(studentIdentifier).get();
          if (doc.exists) {
            studentDocSnapshot = doc;
          }
        } catch (docIdError: any) {
           console.warn(`Attempt to fetch by document ID '${studentIdentifier}' failed or was not valid. Error: ${ docIdError.message }`);
        }
      }
    }

    if (!studentDocSnapshot || !studentDocSnapshot.exists) {
      return NextResponse.json({ message: `Student with identifier '${studentIdentifier}' not found.` }, { status: 404 });
    }

    const studentData = { id: studentDocSnapshot.id, ...studentDocSnapshot.data() } as Student;

    return NextResponse.json(studentData);

  } catch (error: any) {
    console.error('Firestore error fetching student profile:', error);
    let errorMessage = 'Internal server error while fetching student profile.';
    if (error.code) { 
        errorMessage = `Firestore error (${error.code}): ${error.message}`;
    } else if (error.message) {
        errorMessage = error.message;
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
