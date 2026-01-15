
import { NextRequest, NextResponse } from 'next/server';
import { db, auth as adminAuth } from '@/lib/firebaseAdmin';
import type { Host } from '@/lib/types';

async function getHostDocRef(id: string) {
    if (!db) return null;
    const query = db.collection('hosts').where('uid', '==', id).limit(1);
    const snapshot = await query.get();
    if (!snapshot.empty) {
        return snapshot.docs[0].ref;
    }
    
    const docRef = db.collection('hosts').doc(id);
    const doc = await docRef.get();
    if (doc.exists) {
        return docRef;
    }

    return null;
}
  
export async function GET(req: NextRequest, { params }: { params: { hostId: string } }) {
    const { hostId } = params;

    if (!db) {
        return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
    }

    const hostRef = await getHostDocRef(hostId);
    try {
        if (!hostRef) {
                return NextResponse.json({ message: 'Host not found.' }, { status: 404 });
        }

        const doc = await hostRef.get();
        if (!doc.exists) {
        return NextResponse.json({ message: 'Host not found.' }, { status: 404 });
        }
        return NextResponse.json({ id: doc.id, ...doc.data() } as Host);
    } catch (error) {
        console.error(`Error fetching host ${hostId}:`, error);
        return NextResponse.json({ message: 'Internal server error while fetching host.' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: { hostId: string } }) {
    const { hostId } = params;
    if (!db) {
        return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
    }
    const hostRef = await getHostDocRef(hostId);

    try {
        if (!hostRef) {
            return NextResponse.json({ message: 'Host not found to update.' }, { status: 404 });
        }

        const { name, phoneNumber, whatsappNumber } = await req.json();
        const updateData: Partial<Host> = {};

        if (name !== undefined) updateData.name = name;
        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
        if (whatsappNumber !== undefined) updateData.whatsappNumber = whatsappNumber;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ message: 'No fields provided for update.' }, { status: 400 });
        }

        await hostRef.update(updateData);
        const updatedDoc = await hostRef.get();
        return NextResponse.json({ message: `Host ${hostId} updated successfully.`, host: { id: hostRef.id, ...updatedDoc.data() } });

    } catch (error) {
        console.error(`Error updating host ${hostId}:`, error);
        return NextResponse.json({ message: 'Internal server error while updating host.' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { hostId: string } }) {
    const { hostId } = params;
    if (!db || !adminAuth) {
        return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
    }
    const hostRef = await getHostDocRef(hostId);

    try {
        if (!hostRef) {
            return NextResponse.json({ message: 'Host not found.' }, { status: 404 });
        }
        const doc = await hostRef.get();
        if (!doc.exists) {
            return NextResponse.json({ message: 'Host not found.' }, { status: 404 });
        }
        const hostData = doc.data() as Host;
        const uid = hostData.uid;

        await hostRef.delete();

        if (uid) {
            try {
                await adminAuth.deleteUser(uid);
            } catch (authError: any) {
                if (authError.code !== 'auth/user-not-found') {
                    console.error(`Failed to delete Firebase Auth user ${uid} for host, but Firestore document was deleted. Manual cleanup may be required. Error: ${authError.message}`);
                }
            }
        }
        
        return NextResponse.json({ message: `Host ${hostId} deleted successfully.` });
    } catch (error) {
        console.error(`Error deleting host ${hostId}:`, error);
        return NextResponse.json({ message: 'Internal server error while deleting host.' }, { status: 500 });
    }
}
