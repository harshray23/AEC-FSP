
import { NextRequest, NextResponse } from 'next/server';
import { db, Timestamp } from '@/lib/firebaseAdmin';
import type { Announcement } from '@/lib/types';

export async function GET(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database not initialized.' }, { status: 500 });
  }

  const headers = new Headers();
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');

  try {
    const announcementsSnapshot = await db.collection('announcements').orderBy('timestamp', 'desc').limit(10).get();
    const announcements: Announcement[] = announcementsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: (data.timestamp as Timestamp).toMillis(),
      } as Announcement;
    });
    return NextResponse.json(announcements, { headers });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json({ message: 'Internal server error while fetching announcements.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database not initialized.' }, { status: 500 });
  }

  try {
    const { message, sender } = await req.json();
    if (!message || !sender) {
      return NextResponse.json({ message: 'Message and sender are required.' }, { status: 400 });
    }

    const newAnnouncement: Omit<Announcement, 'id'> = {
      message,
      sender,
      timestamp: Timestamp.now().toMillis(),
    };

    const docRef = await db.collection('announcements').add({
        ...newAnnouncement,
        timestamp: Timestamp.fromMillis(newAnnouncement.timestamp),
    });

    return NextResponse.json({ id: docRef.id, ...newAnnouncement }, { status: 201 });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json({ message: 'Internal server error while creating announcement.' }, { status: 500 });
  }
}
