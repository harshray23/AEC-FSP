
import { NextRequest, NextResponse } from 'next/server';
import { db, Timestamp } from '@/lib/firebaseAdmin';
import type { ActivityLog } from '@/lib/types';
import { subDays, startOfDay } from 'date-fns';

export async function GET(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database not initialized.' }, { status: 500 });
  }

  try {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const startOfPeriod = Timestamp.fromDate(startOfDay(thirtyDaysAgo));

    const activitySnapshot = await db.collection('activityLogs')
                                  .where('timestamp', '>=', startOfPeriod)
                                  .orderBy('timestamp', 'desc')
                                  .limit(200) // Limit to a reasonable number for display
                                  .get();
    
    const activities: ActivityLog[] = activitySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
      } as ActivityLog;
    });

    return NextResponse.json(activities);

  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json({ message: 'Internal server error while fetching logs.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database not initialized.' }, { status: 500 });
  }
  try {
      const { user, role, action, details } = await req.json();

      if (!user || !role || !action || !details) {
          return NextResponse.json({ message: 'Missing required fields for activity log.' }, { status: 400 });
      }
      
      const newLog: Omit<ActivityLog, 'id'> = {
          user,
          role,
          action,
          details,
          timestamp: Timestamp.now().toDate().toISOString(),
      };
      
      // Firestore timestamps should be created on the server
      const firestoreLog = {
          ...newLog,
          timestamp: Timestamp.now()
      };

      const docRef = await db.collection('activityLogs').add(firestoreLog);
      
      return NextResponse.json({ id: docRef.id, ...newLog }, { status: 201 });

  } catch (error) {
      console.error('Error creating activity log:', error);
      return NextResponse.json({ message: 'Internal server error while creating log.' }, { status: 500 });
  }
}
