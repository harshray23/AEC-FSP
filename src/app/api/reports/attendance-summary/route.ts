
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import type { Batch, AttendanceRecord } from '@/lib/types';

interface BatchAttendanceSummary {
  batchId: string;
  batchName: string;
  department: string; // Assuming single department for simplicity
  totalStudents: number;
  present: number;
  absent: number;
  late: number;
  totalMarks: number;
}

export async function GET(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database not initialized.' }, { status: 500 });
  }

  try {
    const batchesSnapshot = await db.collection('batches').get();
    const allBatches: Batch[] = batchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Batch));

    const attendanceSnapshot = await db.collection('attendanceRecords').get();
    const allAttendanceRecords: AttendanceRecord[] = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));

    const batchDataMap = new Map<string, BatchAttendanceSummary>();

    allBatches.forEach(batch => {
      batchDataMap.set(batch.id, {
        batchId: batch.id,
        batchName: batch.name,
        department: batch.departments[0] || 'N/A', // Taking first department
        totalStudents: batch.studentIds?.length || 0,
        present: 0,
        absent: 0,
        late: 0,
        totalMarks: 0,
      });
    });

    allAttendanceRecords.forEach(record => {
      const batchStats = batchDataMap.get(record.batchId);
      if (batchStats) {
        batchStats.totalMarks++;
        if (record.status === 'present') batchStats.present++;
        if (record.status === 'absent') batchStats.absent++;
        if (record.status === 'late') batchStats.late++;
      }
    });

    const summaryData = Array.from(batchDataMap.values());
    
    return NextResponse.json(summaryData);

  } catch (error) {
    console.error('Error generating attendance summary:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
