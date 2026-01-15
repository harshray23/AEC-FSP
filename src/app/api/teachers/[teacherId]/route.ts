
import { NextRequest, NextResponse } from 'next/server';
import { db, auth as adminAuth } from '@/lib/firebaseAdmin';
import type { Teacher } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

async function getTeacherDocRef(id: string) {
    if(!db) return null;
    const querySnapshot = await db.collection('teachers').where('uid', '==', id).limit(1).get();
    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].ref;
    }
    const docRef = db.collection('teachers').doc(id);
    const doc = await docRef.get();
    if (doc.exists) return docRef;
    
    return null;
}

export async function GET(req: NextRequest, { params }: { params: { teacherId: string } }) {
    const { teacherId } = params;
    if (!db) {
        return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
    }
    const teacherRef = await getTeacherDocRef(teacherId);

    if (!teacherRef) {
        return NextResponse.json({ message: `Teacher with identifier ${teacherId} not found.` }, { status: 404 });
    }
    
    try {
        const doc = await teacherRef.get();
        if (!doc.exists) {
        return NextResponse.json({ message: 'Teacher not found.' }, { status: 404 });
        }
        return NextResponse.json({ id: doc.id, ...doc.data() } as Teacher);
    } catch (error) {
        console.error(`Error fetching teacher ${teacherId}:`, error);
        return NextResponse.json({ message: 'Internal server error while fetching teacher.' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: { teacherId: string } }) {
    const { teacherId } = params;
    if (!db) {
        return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
    }

    const teacherRef = await getTeacherDocRef(teacherId);

    if (!teacherRef) {
        return NextResponse.json({ message: `Teacher with identifier ${teacherId} not found.` }, { status: 404 });
    }
    try {
        const { name, department, email, phoneNumber, whatsappNumber, status, username } = await req.json();
        const updateData: Partial<Teacher> = {};

        if (name !== undefined) updateData.name = name;
        if (department !== undefined) updateData.department = department;
        if (email !== undefined) updateData.email = email;
        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
        if (whatsappNumber !== undefined) updateData.whatsappNumber = whatsappNumber;
        if (status !== undefined) updateData.status = status;
        if (username !== undefined) updateData.username = username;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ message: 'No fields provided for update.' }, { status: 400 });
        }

        await teacherRef.update(updateData);
        const updatedDoc = await teacherRef.get();
        return NextResponse.json({ message: `Teacher ${teacherId} updated successfully.`, teacher: { id: teacherRef.id, ...updatedDoc.data() } });
    } catch (error) {
        console.error(`Error updating teacher ${teacherId}:`, error);
        return NextResponse.json({ message: 'Internal server error while updating teacher.' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { teacherId: string } }) {
    const { teacherId } = params;
    if (!db || !adminAuth) {
        return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
    }
    const teacherRef = await getTeacherDocRef(teacherId);

    if (!teacherRef) {
        return NextResponse.json({ message: `Teacher with identifier ${teacherId} not found.` }, { status: 404 });
    }
    
    try {
        const doc = await teacherRef.get();
        if (!doc.exists) {
            return NextResponse.json({ message: 'Teacher not found.' }, { status: 404 });
        }
        const teacherData = doc.data() as Teacher;
        const uid = teacherData.uid;

        const batchWrite = db.batch();
        
        const batchesAssignedQuery = db.collection('batches').where('teacherIds', 'array-contains', teacherRef.id);
        const batchesSnapshot = await batchesAssignedQuery.get();
        batchesSnapshot.forEach(batchDoc => {
        batchWrite.update(batchDoc.ref, { teacherIds: FieldValue.arrayRemove(teacherRef.id) });
        });
        
        batchWrite.delete(teacherRef);
        await batchWrite.commit();
        
        if (uid) {
            try {
                    await adminAuth.deleteUser(uid); 
            } catch (authError: any) {
                    if (authError.code !== 'auth/user-not-found') {
                    console.error(`Failed to delete Firebase Auth user ${uid}, but Firestore document was deleted. Manual cleanup may be required. Error: ${authError.message}`);
                }
            }
        }
        
        return NextResponse.json({ message: `Teacher ${teacherId} deleted successfully.` });
    } catch (error) {
        console.error(`Error deleting teacher ${teacherId}:`, error);
        return NextResponse.json({ message: 'Internal server error while deleting teacher.' }, { status: 500 });
    }
}
