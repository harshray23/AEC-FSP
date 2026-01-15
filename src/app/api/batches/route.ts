
import { NextRequest, NextResponse } from 'next/server';
import { db, Timestamp } from '@/lib/firebaseAdmin';
import type { Batch } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
  }

  try {
    const batchesSnapshot = await db.collection('batches').get();
    const batches: Batch[] = batchesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate instanceof Timestamp ? data.startDate.toDate().toISOString() : data.startDate,
        endDate: data.endDate instanceof Timestamp ? data.endDate.toDate().toISOString() : data.endDate,
      } as Batch;
    });
    return NextResponse.json(batches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    return NextResponse.json({ message: 'Internal server error while fetching batches.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
  }

  try {
    const { ...batchPayload }: Omit<Batch, 'id'> = await req.json();

    if (!batchPayload.name || !batchPayload.topic || !batchPayload.teacherIds) {
      return NextResponse.json({ message: 'Missing required fields for batch creation.' }, { status: 400 });
    }
    
    const studentIds = batchPayload.studentIds || [];
    batchPayload.studentIds = studentIds;

    const batchRef = db.collection('batches').doc();
    const newBatchId = batchRef.id;

    const writeBatch = db.batch();

    writeBatch.set(batchRef, batchPayload);

    if (studentIds.length > 0) {
        studentIds.forEach((studentId: string) => {
            const studentRef = db.collection('students').doc(studentId);
            writeBatch.update(studentRef, { batchIds: FieldValue.arrayUnion(newBatchId) });
        });
    }
    
    await writeBatch.commit();

    return NextResponse.json({ message: 'Batch created successfully', batch: { id: newBatchId, ...batchPayload } }, { status: 201 });
  } catch (error) {
    console.error('Error creating batch:', error);
    return NextResponse.json({ message: 'Internal server error while creating batch.' }, { status: 500 });
  }
}
