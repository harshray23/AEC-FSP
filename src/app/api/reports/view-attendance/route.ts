
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import type { Batch, Teacher, Student, AttendanceRecord } from '@/lib/types';

interface AttendanceSummary {
    batchId: string;
    batchName: string;
    topic: string;
    teacherNames: string[];
    studentCount: number;
    totalPossibleSessions: number;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    attendancePercentage: number;
}

export async function GET(req: NextRequest) {
    if (!db) {
        return NextResponse.json({ message: 'Database not initialized.' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');


    if (!from || !to) {
        return NextResponse.json({ message: 'A "from" and "to" date range is required.' }, { status: 400 });
    }

    try {
        const [batchesSnapshot, teachersSnapshot, studentsSnapshot, attendanceSnapshot] = await Promise.all([
            db.collection('batches').get(),
            db.collection('teachers').get(),
            db.collection('students').get(),
            db.collection('attendanceRecords').where('date', '>=', from).where('date', '<=', to).get()
        ]);

        const allBatches: Batch[] = batchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Batch));
        const teachersMap = new Map(teachersSnapshot.docs.map(doc => [doc.id, doc.data() as Teacher]));
        const allAttendanceRecords: AttendanceRecord[] = attendanceSnapshot.docs.map(doc => doc.data() as AttendanceRecord);
        
        const summaryMap = new Map<string, AttendanceSummary>();

        allBatches.forEach(batch => {
            summaryMap.set(batch.id, {
                batchId: batch.id,
                batchName: batch.name,
                topic: batch.topic,
                teacherNames: batch.teacherIds.map(id => teachersMap.get(id)?.name).filter(Boolean) as string[],
                studentCount: batch.studentIds?.length || 0,
                totalPossibleSessions: 0,
                totalPresent: 0,
                totalAbsent: 0,
                totalLate: 0,
                attendancePercentage: 0,
            });
        });

        allAttendanceRecords.forEach(record => {
            const summary = summaryMap.get(record.batchId);
            if (summary) {
                switch (record.status) {
                    case 'present':
                        summary.totalPresent++;
                        break;
                    case 'absent':
                        summary.totalAbsent++;
                        break;
                    case 'late':
                        summary.totalLate++;
                        break;
                }
            }
        });
        
        const finalSummaries = Array.from(summaryMap.values()).map(summary => {
            const totalMarked = summary.totalPresent + summary.totalAbsent + summary.totalLate;
            const percentage = totalMarked > 0 ? ((summary.totalPresent + summary.totalLate) / totalMarked) * 100 : 0;
            return {
                ...summary,
                attendancePercentage: percentage
            };
        });

        return NextResponse.json(finalSummaries);

    } catch (error) {
        console.error('Error generating attendance summary:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
