
import { NextRequest, NextResponse } from 'next/server';
import { db, auth as adminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Student } from '@/lib/types';

export async function PUT(req: NextRequest, { params }: { params: { studentId: string } }) {
    const { studentId } = params;

    if (!db) {
        return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
    }

    const studentRef = db.collection('students').doc(studentId);

    try {
        const doc = await studentRef.get();
        if (!doc.exists) {
            return NextResponse.json({ message: 'Student not found to update.' }, { status: 404 });
        }

        const { section, academics, phoneNumber, whatsappNumber, address, personalDetails, permanentAddress, profileEditCount } = await req.json();
        const updateData: { [key: string]: any } = {};

        if (section !== undefined) updateData.section = section;
        if (academics !== undefined) updateData.academics = academics;
        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
        if (whatsappNumber !== undefined) updateData.whatsappNumber = whatsappNumber;
        if (address !== undefined) updateData.address = address;
        if (personalDetails !== undefined) updateData.personalDetails = personalDetails;
        if (permanentAddress !== undefined) updateData.permanentAddress = permanentAddress;
        if (profileEditCount !== undefined) updateData.profileEditCount = profileEditCount;
        
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ message: 'No fields provided for update.' }, { status: 400 });
        }
        
        await studentRef.update(updateData);

        const updatedDoc = await studentRef.get();
        const updatedStudent = { id: updatedDoc.id, ...updatedDoc.data() };
        
        return NextResponse.json({ message: 'Student profile updated successfully.', student: updatedStudent });

      } catch (error) {
        console.error(`Error updating student for ${studentId}:`, error);
        return NextResponse.json({ message: 'Internal server error while updating student details.' }, { status: 500 });
      }
}
    
export async function DELETE(req: NextRequest, { params }: { params: { studentId: string } }) {
    const { studentId } = params;
    if (!db || !adminAuth) {
        return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
    }

    const studentRef = db.collection('students').doc(studentId);
      try {
        const studentDoc = await studentRef.get();
        if (!studentDoc.exists) {
          return NextResponse.json({ message: 'Student not found to delete.' }, { status: 404 });
        }

        const studentData = studentDoc.data() as Student;
        const uid = studentData.uid;
        const batchIds = studentData.batchIds;

        const writeBatch = db.batch();

        if (batchIds && batchIds.length > 0) {
            batchIds.forEach(batchId => {
                const batchRef = db.collection('batches').doc(batchId);
                writeBatch.update(batchRef, {
                    studentIds: FieldValue.arrayRemove(studentId)
                });
            });
        }

        writeBatch.delete(studentRef);
        
        await writeBatch.commit();
        
        if (uid) {
            try {
                await adminAuth.deleteUser(uid);
            } catch (authError: any) {
                if (authError.code !== 'auth/user-not-found') {
                    console.error(`Failed to delete Firebase Auth user ${uid}, but Firestore document ${studentId} was deleted. Manual cleanup may be required.`, authError);
                }
            }
        }

        return NextResponse.json({ message: `Student ${studentData.name} deleted successfully.` });

      } catch (error) {
        console.error(`Error deleting student ${studentId}:`, error);
        return NextResponse.json({ message: 'Internal server error while deleting student.' }, { status: 500 });
      }
}
