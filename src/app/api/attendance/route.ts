
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import type { Query } from 'firebase-admin/firestore';
import type { AttendanceRecord } from '@/lib/types';

export async function GET(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database not initialized.' }, { status: 500 });
  }
  
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');
  const batchId = searchParams.get('batchId');
  const date = searchParams.get('date');
  const batchHalf = searchParams.get('batchHalf');

  try {
    let query: Query = db.collection('attendanceRecords');

    if (studentId) {
      query = query.where('studentId', '==', studentId);
    }
    if (batchId) {
      query = query.where('batchId', '==', batchId);
    }
    if (date) {
      query = query.where('date', '==', date);
    }
    if (batchHalf) {
      query = query.where('batchHalf', '==', batchHalf);
    }

    const snapshot = await query.get();
    const records: AttendanceRecord[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as AttendanceRecord;
    });

    return NextResponse.json(records);

  } catch (error) {
    console.error("Error fetching attendance records:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
