
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import type { Admin } from '@/lib/types';
import type { UserApprovalStatus } from '@/lib/types';
import type { Query } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    let query: Query = db.collection('admins');

    if (status) {
      if (!["active", "pending_approval", "rejected"].includes(status)) {
        return NextResponse.json({ message: 'Invalid status filter value.' }, { status: 400 });
      }
      query = query.where('status', '==', status as UserApprovalStatus);
    }

    const adminsSnapshot = await query.get();
    const admins: Admin[] = adminsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Admin));
    return NextResponse.json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    return NextResponse.json({ message: 'Internal server error while fetching admins.' }, { status: 500 });
  }
}
