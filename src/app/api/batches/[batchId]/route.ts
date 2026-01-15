
import { NextRequest, NextResponse } from 'next/server';
import { db, Timestamp } from '@/lib/firebaseAdmin';
import type { Batch } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(req: NextRequest, { params }: { params: { batchId: string } }) {
    const { batchId } = params;

    if (!db) {
        return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
    }

    const batchRef = db.collection('batches').doc(batchId);
    try {
        const doc = await batchRef.get();
        if (!doc.exists) {
        return NextResponse.json({ message: 'Batch not found.' }, { status: 404 });
        }
        const data = doc.data();
        const batch = { 
            id: doc.id, 
            ...data,
            startDate: data?.startDate instanceof Timestamp ? data.startDate.toDate().toISOString() : data?.startDate,
            endDate: data?.endDate instanceof Timestamp ? data.endDate.toDate().toISOString() : data?.endDate,
        } as Batch;
        return NextResponse.json(batch);
    } catch (error) {
        console.error(`Error fetching batch ${batchId}:`, error);
        return NextResponse.json({ message: 'Internal server error while fetching batch.' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: { batchId: string } }) {
    const { batchId } = params;

    if (!db) {
        return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
    }

    const batchRef = db.collection('batches').doc(batchId);
    try {
        const currentDoc = await batchRef.get();
        if (!currentDoc.exists) {
        return NextResponse.json({ message: 'Batch not found to update.' }, { status: 404 });
        }
        
        const oldBatchData = currentDoc.data() as Batch;
        const oldStudentIds = oldBatchData.studentIds || [];
        
        const { studentIds: newStudentIds, ...updateData } = await req.json();
        
        const finalUpdateData = { ...updateData };
        if (newStudentIds) {
        finalUpdateData.studentIds = newStudentIds;
        }

        const addedStudents = (newStudentIds || []).filter((id: string) => !oldStudentIds.includes(id));
        const removedStudents = oldStudentIds.filter((id: string) => !(newStudentIds || []).includes(id));
        
        const transaction = db.runTransaction(async t => {
            t.update(batchRef, finalUpdateData);

            addedStudents.forEach((studentId: string) => {
                const studentRef = db.collection('students').doc(studentId);
                t.update(studentRef, { batchIds: FieldValue.arrayUnion(batchId) });
            });

            removedStudents.forEach((studentId: string) => {
                const studentRef = db.collection('students').doc(studentId);
                t.update(studentRef, { batchIds: FieldValue.arrayRemove(batchId) });
            });
        });

        await transaction;
        
        const updatedDoc = await batchRef.get();
        const batchWithId = { id: batchId, ...updatedDoc.data() };
        
        return NextResponse.json({ message: `Batch ${batchId} updated successfully.`, batch: batchWithId });

    } catch (error) {
        console.error(`Error updating batch ${batchId}:`, error);
        return NextResponse.json({ message: 'Internal server error while updating batch.' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { batchId: string } }) {
    const { batchId } = params;
    if (!db) {
        return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
    }

    const batchRef = db.collection('batches').doc(batchId);
    try {
        const doc = await batchRef.get();
        if (!doc.exists) {
        return NextResponse.json({ message: 'Batch not found to delete.' }, { status: 404 });
        }

        const studentsToUpdateSnapshot = await db.collection('students').where('batchIds', 'array-contains', batchId).get();
        if (!studentsToUpdateSnapshot.empty) {
        const studentBatchWrite = db.batch();
        studentsToUpdateSnapshot.docs.forEach(studentDoc => {
            studentBatchWrite.update(studentDoc.ref, { batchIds: FieldValue.arrayRemove(batchId) });
        });
        await studentBatchWrite.commit();
        }
        
        await batchRef.delete();
        return NextResponse.json({ message: `Batch ${batchId} deleted successfully.` });
    } catch (error) {
        console.error(`Error deleting batch ${batchId}:`, error);
        return NextResponse.json({ message: 'Internal server error while deleting batch.' }, { status: 500 });
    }
}
