
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import type { Student } from '@/lib/types';

export async function POST(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database not initialized' }, { status: 500 });
  }

  const { studentIds, action } = await req.json();

  if (!Array.isArray(studentIds) || studentIds.length === 0 || !action) {
    return NextResponse.json({ message: 'Missing required fields: studentIds (array) and action.' }, { status: 400 });
  }

  if (action !== 'promote' && action !== 'pass_out') {
    return NextResponse.json({ message: 'Invalid action. Must be "promote" or "pass_out".' }, { status: 400 });
  }

  try {
    const writeBatch = db.batch();
    const studentRefs = studentIds.map(id => db.collection('students').doc(id));
    const studentDocs = await db.getAll(...studentRefs);

    let promotedCount = 0;
    let passedOutCount = 0;

    for (const studentDoc of studentDocs) {
      if (!studentDoc.exists) {
        console.warn(`Student with ID ${studentDoc.id} not found, skipping.`);
        continue;
      }
      
      const studentData = studentDoc.data() as Student;
      const studentRef = studentDoc.ref;

      if (action === 'promote') {
        if (studentData.currentYear && studentData.currentYear < 4) {
          writeBatch.update(studentRef, { currentYear: studentData.currentYear + 1 });
          promotedCount++;
        } else if (studentData.currentYear === 4) {
          writeBatch.update(studentRef, { status: 'passed_out' });
          passedOutCount++;
        }
      } else if (action === 'pass_out') {
        writeBatch.update(studentRef, { status: 'passed_out' });
        passedOutCount++;
      }
    }
    
    await writeBatch.commit();
    
    let message = 'Promotion process complete.';
    if (promotedCount > 0) message += ` ${promotedCount} student(s) promoted.`;
    if (passedOutCount > 0) message += ` ${passedOutCount} student(s) marked as passed out.`;

    return NextResponse.json({ message });

  } catch (error) {
    console.error('Error processing student promotion/status change:', error);
    return NextResponse.json({ message: 'Internal server error while processing request.' }, { status: 500 });
  }
}
