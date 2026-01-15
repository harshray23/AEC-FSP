
import { NextRequest, NextResponse } from 'next/server';
import { db, auth as adminAuth } from '@/lib/firebaseAdmin';
import type { Admin } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: { adminId: string } }) {
  const { adminId } = params;

  if (!db || !adminAuth) {
    return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
  }

  try {
    const doc = await db.collection('admins').doc(adminId).get();
    if (!doc.exists) {
      return NextResponse.json({ message: 'Admin not found.' }, { status: 404 });
    }
    return NextResponse.json({ id: doc.id, ...doc.data() } as Admin);
  } catch (error) {
    console.error(`Error fetching admin ${adminId}:`, error);
    return NextResponse.json({ message: 'Internal server error while fetching admin.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { adminId: string } }) {
    const { adminId } = params;

  if (!db || !adminAuth) {
    return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
  }
  
  const adminRef = db.collection('admins').doc(adminId);

  try {
    const { name, email, phoneNumber, whatsappNumber, status, username } = await req.json();
    const updateData: Partial<Admin> = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (whatsappNumber !== undefined) updateData.whatsappNumber = whatsappNumber;
    if (status !== undefined) updateData.status = status;
    if (username !== undefined) updateData.username = username;


    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ message: 'No fields provided for update.' }, { status: 400 });
    }
    
    await adminRef.update(updateData);
    const updatedDoc = await adminRef.get();
    return NextResponse.json({ message: `Admin ${adminId} updated successfully.`, admin: { id: adminRef.id, ...updatedDoc.data() } });
  } catch (error) {
    console.error(`Error updating admin ${adminId}:`, error);
    return NextResponse.json({ message: 'Internal server error while updating admin.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { adminId: string } }) {
    const { adminId } = params;

    if (!db || !adminAuth) {
        return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
    }

    const adminRef = db.collection('admins').doc(adminId);
  try {
    const doc = await adminRef.get();
    if (!doc.exists) {
        return NextResponse.json({ message: 'Admin not found.' }, { status: 404 });
    }
    const adminData = doc.data() as Admin;
    const uid = adminData.uid;

    await adminRef.delete();
    
    if (uid) {
        try {
            await adminAuth.deleteUser(uid);
        } catch (authError: any) {
            if (authError.code !== 'auth/user-not-found') {
                console.error(`Failed to delete Firebase Auth user ${uid}, but Firestore document was deleted. Manual cleanup may be required. Error: ${authError.message}`);
            }
        }
    }
    
    return NextResponse.json({ message: `Admin ${adminId} deleted successfully.` });
  } catch (error) {
    console.error(`Error deleting admin ${adminId}:`, error);
    return NextResponse.json({ message: 'Internal server error while deleting admin.' }, { status: 500 });
  }
}
