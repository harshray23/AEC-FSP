
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import type { Student } from '@/lib/types';
import type { Query } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ message: 'Database connection not initialized.' }, { status: 500 });
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department');
    const searchTerm = searchParams.get('searchTerm');
    const limit = searchParams.get('limit') || '20';
    const startAfter = searchParams.get('startAfter');
    const status = searchParams.get('status');
    const simple = searchParams.get('simple');
    
    const parsedLimit = parseInt(limit as string, 10);

    if (status === 'passed_out') {
      const passedOutSnapshot = await db.collection('students').where('status', '==', 'passed_out').get();
      const students: Student[] = passedOutSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Student));
      return NextResponse.json({ students, lastVisibleDoc: null });
    }
    
    if (simple === 'true') {
        const snapshot = await db.collection('students').get();
        const students: Student[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                academics: data.academics || {},
            } as Partial<Student> as Student;
        });
        return NextResponse.json({ students, lastVisibleDoc: null });
    }

    if (searchTerm) {
      const term = searchTerm.trim().toLowerCase();
      const studentsMap = new Map<string, Student>();

      const nameQuery = db.collection('students').orderBy('name').startAt(term).endAt(term + '\uf8ff').get();
      const emailQuery = db.collection('students').orderBy('email').startAt(term).endAt(term + '\uf8ff').get();
      const rollNumberQuery = db.collection('students').orderBy('rollNumber').startAt(term).endAt(term + '\uf8ff').get();

      const [nameSnapshot, emailSnapshot, rollNumberSnapshot] = await Promise.all([nameQuery, emailQuery, rollNumberQuery]);
      
      const processSnapshot = (snapshot: FirebaseFirestore.QuerySnapshot) => {
          snapshot.docs.forEach(doc => {
              if (!studentsMap.has(doc.id)) {
                  studentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Student);
              }
          });
      };

      processSnapshot(nameSnapshot);
      processSnapshot(emailSnapshot);
      processSnapshot(rollNumberSnapshot);
      
      let students = Array.from(studentsMap.values());
      
      students = students.filter(student => student.status !== 'passed_out');
      if (department && department !== 'all') {
        students = students.filter(student => student.department === department);
      }
      
      return NextResponse.json({ students: students.slice(0, parsedLimit), lastVisibleDoc: null });
    }

    let query: Query = db.collection('students');
    
    if (department && department !== 'all') {
      query = query.where('department', '==', department);
    } else {
      query = query.orderBy('studentId');
    }
    
    if (startAfter) {
        const lastVisibleDocData = JSON.parse(startAfter);
        const docRef = db.collection('students').doc(lastVisibleDocData.id);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            query = query.startAfter(docSnap);
        }
    }

    const finalQuery = query.limit(parsedLimit * 2);
    const studentsSnapshot = await finalQuery.get();
    
    const students = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    } as Student)).filter(s => s.status !== 'passed_out');

    const limitedStudents = students.slice(0, parsedLimit);

    let lastVisibleDoc = null;
    if (students.length > parsedLimit && limitedStudents.length > 0) {
        const lastDocInPage = limitedStudents[limitedStudents.length - 1];
        lastVisibleDoc = { id: lastDocInPage.id, studentId: lastDocInPage.studentId };
    }

    return NextResponse.json({ students: limitedStudents, lastVisibleDoc });

  } catch (error: any) {
    console.error('Error fetching students:', error);
    const errorMessage = error.details || error.message || 'Internal server error while fetching students.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
