
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database not initialized' }, { status: 500 });
  }

  const { records, remarks, batchId, date, subject, batchHalf } = await req.json();

  if (!records || typeof records !== 'object' || !batchId || !date || !subject || !batchHalf) {
    return NextResponse.json({ message: 'Missing required fields: records, batchId, date, subject, batchHalf' }, { status: 400 });
  }

  try {
    const attendanceCollection = db.collection('attendanceRecords');

    const q = attendanceCollection.where('batchId', '==', batchId).where('date', '==', date).where('batchHalf', '==', batchHalf);
    const existingDocsSnap = await q.get();
    
    const existingRecordsMap = new Map<string, {docId: string, status: string, remarks?: string}>();
    existingDocsSnap.forEach(doc => {
      existingRecordsMap.set(doc.data().studentId, { 
          docId: doc.id, 
          status: doc.data().status,
          remarks: doc.data().remarks
      });
    });

    const writeBatch = db.batch();

    for (const studentId in records) {
        if (Object.prototype.hasOwnProperty.call(records, studentId)) {
            const newStatus = records[studentId];
            const newRemark = remarks ? remarks[studentId] : undefined;
            const existingRecord = existingRecordsMap.get(studentId);

            if (existingRecord) {
                const updatePayload: { [key: string]: any } = {};
                
                if (existingRecord.status !== newStatus) {
                  updatePayload.status = newStatus;
                }
                if (newRemark !== undefined && existingRecord.remarks !== newRemark) {
                  updatePayload.remarks = newRemark;
                }

                if (Object.keys(updatePayload).length > 0) {
                    const docRef = attendanceCollection.doc(existingRecord.docId);
                    writeBatch.update(docRef, updatePayload);
                }
            } else {
                const newDocRef = attendanceCollection.doc();
                writeBatch.set(newDocRef, {
                    studentId,
                    batchId,
                    date,
                    subject,
                    status: newStatus,
                    batchHalf: batchHalf,
                    remarks: newRemark || "",
                });
            }
        }
    }

    await writeBatch.commit();
    return NextResponse.json({ message: 'Attendance saved successfully.' });

  } catch (error) {
    console.error('Error saving attendance:', error);
    return NextResponse.json({ message: 'Internal server error while saving attendance.' }, { status: 500 });
  }
}
