
import { NextRequest, NextResponse } from 'next/server';
import { db, auth as adminAuth } from '@/lib/firebaseAdmin';
import type { UserRecord } from 'firebase-admin/auth';
import { USER_ROLES, DEPARTMENTS } from '@/lib/constants';
import type { Teacher, Student, Batch, Host, Admin } from '@/lib/types';

const superAdmin: Omit<Admin, 'id' | 'uid'> & {password: string} = {
  name: "Harsh Ray",
  email: "harshray2007@gmail.com",
  role: "admin",
  status: "active",
  username: "harsh_admin",
  password: "Password@123",
  phoneNumber: "9002555217",
  whatsappNumber: "9002555217",
};

const superHost: Omit<Host, 'id' | 'uid'> & {password: string} = {
  name: "Sanjay",
  email: "sanjay041024@gmail.com",
  role: "host",
  status: "active",
  password: "Sanjay@9851"
};

const elvishHost: Omit<Host, 'id' | 'uid'> & {password: string} = {
  name: "Elvish Ray",
  email: "elvishray007@gmail.com",
  role: "host",
  status: "active",
  password: "harsh@123"
};

const sampleTeachers: (Omit<Teacher, 'id' | 'uid'> & {password: string})[] = [
  { name: 'Dr. Evelyn Reed', email: 'e.reed@example.com', role: 'teacher', department: 'cse', status: 'active', username: 'evelyn_reed', password: 'Password@123' },
  { name: 'Mr. Samuel Chen', email: 's.chen@example.com', role: 'teacher', department: 'it', status: 'active', username: 'samuel_chen', password: 'Password@123' },
  { name: 'Ms. Priya Kaur', email: 'p.kaur@example.com', role: 'teacher', department: 'ece', status: 'active', username: 'priya_kaur', password: 'Password@123' },
];

const sampleStudents: (Omit<Student, 'id' | 'uid'> & {password: string})[] = [
  { name: 'Aarav Sharma', email: 'aarav.s@example.com', studentId: 'AEC/2024/0001', rollNumber: 'CSE/24/01', registrationNumber: 'REG-CSE-01', department: 'cse', section: 'A', phoneNumber: '9876543210', isEmailVerified: true, isPhoneVerified: true, role: 'student', password: 'Password@123', admissionYear: 2024, currentYear: 1 },
  { name: 'Diya Patel', email: 'diya.p@example.com', studentId: 'AEC/2024/0002', rollNumber: 'CSE/24/02', registrationNumber: 'REG-CSE-02', department: 'cse', section: 'A', phoneNumber: '9876543211', isEmailVerified: true, isPhoneVerified: true, role: 'student', password: 'Password@123', admissionYear: 2024, currentYear: 1 },
  { name: 'Rohan Mehta', email: 'rohan.m@example.com', studentId: 'AEC/2023/0001', rollNumber: 'IT/23/01', registrationNumber: 'REG-IT-01', department: 'it', section: 'B', phoneNumber: '9876543212', isEmailVerified: true, isPhoneVerified: true, role: 'student', password: 'Password@123', admissionYear: 2023, currentYear: 2 },
  { name: 'Isha Singh', email: 'isha.s@example.com', studentId: 'AEC/2023/0002', rollNumber: 'IT/23/02', registrationNumber: 'REG-IT-02', department: 'it', section: 'B', phoneNumber: '9876543213', isEmailVerified: true, isPhoneVerified: true, role: 'student', password: 'Password@123', admissionYear: 2023, currentYear: 2 },
  { name: 'Arjun Verma', email: 'arjun.v@example.com', studentId: 'AEC/2022/0001', rollNumber: 'ECE/22/01', registrationNumber: 'REG-ECE-01', department: 'ece', section: 'C', phoneNumber: '9876543214', isEmailVerified: true, isPhoneVerified: true, role: 'student', password: 'Password@123', admissionYear: 2022, currentYear: 3 },
];

const sampleBatchDefinitions: Omit<Batch, 'id' | 'teacherIds' | 'studentIds'>[] = [
  { name: 'FSP-CSE-JAVA-A', departments: ['cse', 'it'], topic: 'Core Java', startDate: new Date('2024-08-01').toISOString(), endDate: new Date('2024-11-30').toISOString(), daysOfWeek: ['Monday', 'Wednesday', 'Friday'], startTimeFirstHalf: '09:30', endTimeFirstHalf: '11:00', startTimeSecondHalf: '11:15', endTimeSecondHalf: '12:45', roomNumber: 'R301', status: 'Scheduled' },
  { name: 'FSP-IT-2024-B', departments: ['it', 'ece'], topic: 'Cloud Computing', startDate: new Date('2024-08-01').toISOString(), endDate: new Date('2024-12-15').toISOString(), daysOfWeek: ['Tuesday', 'Thursday'], startTimeFirstHalf: '14:00', endTimeFirstHalf: '15:30', roomNumber: 'R302', status: 'Scheduled' },
];

const ensureAuthUser = async (user: { email: string; password?: string; name: string; }): Promise<UserRecord> => {
  try {
    return await adminAuth.getUserByEmail(user.email);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      if (!user.password) {
        throw new Error(`Password missing for new user: ${user.email}`);
      }
      console.log(`Creating auth user for ${user.email}`);
      return await adminAuth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.name,
        emailVerified: true,
      });
    }
    throw error;
  }
};

export async function POST(req: NextRequest) {
  if (!db || !adminAuth) {
    return NextResponse.json({ message: 'Firebase Admin SDK not initialized.' }, { status: 500 });
  }

  try {
    const writeBatch = db.batch();
    
    const { password: adminPassword, ...adminData } = superAdmin;
    const adminUserRecord = await ensureAuthUser({ email: adminData.email, password: adminPassword, name: adminData.name });
    const adminRef = db.collection('admins').doc(adminUserRecord.uid);
    writeBatch.set(adminRef, { ...adminData, uid: adminUserRecord.uid }, { merge: true });

    const { password: hostPassword, ...hostData } = superHost;
    const hostUserRecord = await ensureAuthUser({ email: hostData.email, password: hostPassword, name: hostData.name });
    const hostRef = db.collection('hosts').doc(hostUserRecord.uid);
    writeBatch.set(hostRef, { ...hostData, uid: hostUserRecord.uid }, { merge: true });

    const { password: elvishPassword, ...elvishHostData } = elvishHost;
    const elvishHostUserRecord = await ensureAuthUser({ email: elvishHostData.email, password: elvishPassword, name: elvishHostData.name });
    const elvishHostRef = db.collection('hosts').doc(elvishHostUserRecord.uid);
    writeBatch.set(elvishHostRef, { ...elvishHostData, uid: elvishHostUserRecord.uid }, { merge: true });

    const teacherDocIds = await Promise.all(sampleTeachers.map(async (teacher) => {
      const { password: teacherPassword, ...teacherData } = teacher;
      const teacherRecord = await ensureAuthUser({ email: teacherData.email, password: teacherPassword, name: teacherData.name });
      const teacherRef = db.collection('teachers').doc(teacherRecord.uid);
      writeBatch.set(teacherRef, { ...teacherData, uid: teacherRecord.uid }, { merge: true });
      return teacherRecord.uid;
    }));

    const studentDocIdsByDept: { [key: string]: string[] } = {};
    await Promise.all(sampleStudents.map(async (student) => {
        const { password: studentPassword, ...studentData } = student;
        const studentRecord = await ensureAuthUser({ email: studentData.email, password: studentPassword, name: studentData.name });
        const studentRef = db.collection('students').doc(studentRecord.uid);
        writeBatch.set(studentRef, { ...studentData, uid: studentRecord.uid }, { merge: true });
        
        if (!studentDocIdsByDept[studentData.department]) {
            studentDocIdsByDept[studentData.department] = [];
        }
        studentDocIdsByDept[studentData.department].push(studentRecord.uid);
    }));

    const cseBatchData = { ...sampleBatchDefinitions[0], teacherIds: [teacherDocIds[0]], studentIds: [...(studentDocIdsByDept['cse'] || []), ...(studentDocIdsByDept['it'] || [])] };
    const itBatchData = { ...sampleBatchDefinitions[1], teacherIds: [teacherDocIds[1]], studentIds: [...(studentDocIdsByDept['it'] || []), ...(studentDocIdsByDept['ece'] || [])] };
    
    const cseBatchQuery = await db.collection('batches').where('name', '==', cseBatchData.name).limit(1).get();
    if (cseBatchQuery.empty) {
        console.log(`Creating batch: ${cseBatchData.name}`);
        const cseBatchRef = db.collection('batches').doc();
        writeBatch.set(cseBatchRef, cseBatchData);
        for (const studentId of cseBatchData.studentIds) {
            const studentRef = db.collection('students').doc(studentId);
            writeBatch.update(studentRef, { batchId: cseBatchRef.id });
        }
    }

    const itBatchQuery = await db.collection('batches').where('name', '==', itBatchData.name).limit(1).get();
    if (itBatchQuery.empty) {
        console.log(`Creating batch: ${itBatchData.name}`);
        const itBatchRef = db.collection('batches').doc();
        writeBatch.set(itBatchRef, itBatchData);
        for (const studentId of itBatchData.studentIds) {
            const studentRef = db.collection('students').doc(studentId);
            writeBatch.update(studentRef, { batchId: itBatchRef.id });
        }
    }

    await writeBatch.commit();
    
    return NextResponse.json({ message: "Database seeding/update complete. Existing users were not overwritten." });

  } catch (error: any) {
    console.error('Error seeding database:', error);
    return NextResponse.json({ message: error.message || 'Internal server error during seeding.' }, { status: 500 });
  }
}
