
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

    // 1. Try fetching by document ID directly (most efficient if it's the UID)
    const directDoc = await studentsRef.doc(studentIdentifier).get();
    if (directDoc.exists) {
        studentDocSnapshot = directDoc;
    } else {
        // 2. Try searching by 'uid' field
        const uidQuerySnapshot = await studentsRef.where('uid', '==', studentIdentifier).limit(1).get();
        if (!uidQuerySnapshot.empty) {
            studentDocSnapshot = uidQuerySnapshot.docs[0];
        } else {
            // 3. Try searching by 'studentId' field (custom format like AEC/...)
            const studentIdFieldQuerySnapshot = await studentsRef.where('studentId', '==', studentIdentifier).limit(1).get();
            if (!studentIdFieldQuerySnapshot.empty) {
                studentDocSnapshot = studentIdFieldQuerySnapshot.docs[0];
            }
        }
    }

    if (!studentDocSnapshot || !studentDocSnapshot.exists) {
      return NextResponse.json({ message: `Student with identifier '${studentIdentifier}' not found.` }, { status: 404 });
    }

    const data = studentDocSnapshot.data();
    const studentData = { 
        id: studentDocSnapshot.id, 
        ...data,
        // Ensure critical fields exist
        role: data?.role || 'student',
        status: data?.status || 'active'
    } as Student;

    return NextResponse.json(studentData);

  } catch (error: any) {
    console.error('Firestore error fetching student profile:', error);
    return NextResponse.json({ message: error.message || 'Internal server error while fetching student profile.' }, { status: 500 });
  }
}
