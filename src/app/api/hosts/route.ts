
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import type { Host } from '@/lib/types';

export async function GET(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
  }

  try {
    const hostsSnapshot = await db.collection('hosts').get();
    const hosts: Host[] = hostsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Host));
    return NextResponse.json(hosts);
  } catch (error) {
    console.error('Error fetching hosts:', error);
    return NextResponse.json({ message: 'Internal server error while fetching hosts.' }, { status: 500 });
  }
}
