
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function PUT(req: NextRequest, { params }: { params: { announcementId: string } }) {
  const { announcementId } = params;

  if (!db) {
    return NextResponse.json({ message: 'Database not initialized.' }, { status: 500 });
  }

  const announcementRef = db.collection('announcements').doc(announcementId);

  try {
    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ message: 'Message is required for update.' }, { status: 400 });
    }
    await announcementRef.update({ message });
    return NextResponse.json({ message: 'Announcement updated successfully.' });
  } catch (error) {
    console.error(`Error updating announcement ${announcementId}:`, error);
    return NextResponse.json({ message: 'Internal server error while updating announcement.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { announcementId: string } }) {
  const { announcementId } = params;

  if (!db) {
    return NextResponse.json({ message: 'Database not initialized.' }, { status: 500 });
  }
  
  const announcementRef = db.collection('announcements').doc(announcementId);

  try {
    await announcementRef.delete();
    return NextResponse.json({ message: 'Announcement deleted successfully.' });
  } catch (error) {
    console.error(`Error deleting announcement ${announcementId}:`, error);
    return NextResponse.json({ message: 'Internal server error while deleting announcement.' }, { status: 500 });
  }
}
