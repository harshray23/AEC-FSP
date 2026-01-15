
import { NextRequest, NextResponse } from 'next/server';
import { db, auth as adminAuth } from '@/lib/firebaseAdmin';
import type { Student } from '@/lib/types';

const BATCH_SIZE = 500;

export async function DELETE(req: NextRequest) {
  if (!db || !adminAuth) {
    return NextResponse.json({ message: 'Database not initialized' }, { status: 500 });
  }

  try {
    const passedOutQuery = db.collection('students').where('status', '==', 'passed_out');
    const snapshot = await passedOutQuery.get();

    if (snapshot.empty) {
      return NextResponse.json({ message: 'No passed-out students to delete.' });
    }

    const studentsToDelete = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    const uidsToDelete = studentsToDelete.map(s => s.uid).filter(Boolean) as string[];

    const firestoreBatches = [];
    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = snapshot.docs.slice(i, i + BATCH_SIZE);
        chunk.forEach(doc => batch.delete(doc.ref));
        firestoreBatches.push(batch.commit());
    }
    await Promise.all(firestoreBatches);
    
    if (uidsToDelete.length > 0) {
      const authBatches = [];
      for (let i = 0; i < uidsToDelete.length; i += 1000) {
          const chunk = uidsToDelete.slice(i, i + 1000);
          authBatches.push(adminAuth.deleteUsers(chunk));
      }
      const results = await Promise.all(authBatches);
      results.forEach(result => {
          if (result.failureCount > 0) {
              console.warn(`Failed to delete ${result.failureCount} auth users. See logs for details.`);
              result.errors.forEach(err => console.error(err.error));
          }
      });
    }

    return NextResponse.json({ message: `Successfully deleted ${snapshot.size} passed-out student records.` });

  } catch (error) {
    console.error('Error deleting passed-out students:', error);
    return NextResponse.json({ message: 'Internal server error while deleting students.' }, { status: 500 });
  }
}
