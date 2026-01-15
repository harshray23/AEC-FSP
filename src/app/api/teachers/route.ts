
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import type { Teacher } from '@/lib/types';
import type { UserApprovalStatus } from '@/lib/types';
import type { Query } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query: Query = db.collection('teachers');

    if (status) {
      if (!["active", "pending_approval", "rejected"].includes(status)) {
        return NextResponse.json({ message: 'Invalid status filter value.' }, { status: 400 });
      }
      query = query.where('status', '==', status as UserApprovalStatus);
    }

    const teachersSnapshot = await query.get();
    const teachers: Teacher[] = teachersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Teacher));
    return NextResponse.json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json({ message: 'Internal server error while fetching teachers.' }, { status: 500 });
  }
}
