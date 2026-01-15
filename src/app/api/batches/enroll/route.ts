
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database service is not available.' }, { status: 500 });
  }

  const { batchId, studentId } = await req.json();

  if (!batchId || !studentId) {
    return NextResponse.json({ message: 'Batch ID and Student ID are required.' }, { status: 400 });
  }

  const studentRef = db.collection('students').doc(studentId);
  const batchRef = db.collection('batches').doc(batchId);

  try {
    const enrollmentSuccessful = await db.runTransaction(async (transaction) => {
      const studentDoc = await transaction.get(studentRef);
      const batchDoc = await transaction.get(batchRef);

      if (!studentDoc.exists) {
        throw new Error('Student not found.');
      }
      if (!batchDoc.exists) {
        throw new Error('Batch not found.');
      }
      
      const studentData = studentDoc.data();
      if (studentData?.batchIds?.includes(batchId)) {
        throw new Error('Student is already enrolled in this batch.');
      }

      transaction.update(studentRef, { batchIds: FieldValue.arrayUnion(batchId) });
      transaction.update(batchRef, { studentIds: FieldValue.arrayUnion(studentId) });
      
      return true;
    });
    
    if (enrollmentSuccessful) {
        return NextResponse.json({ message: 'Successfully enrolled in the batch.' });
    } else {
        throw new Error('Transaction failed without an explicit error.');
    }

  } catch (error: any) {
    console.error('Enrollment transaction failed:', error);
    return NextResponse.json({ message: error.message || 'Failed to enroll in the batch.' }, { status: 400 });
  }
}
