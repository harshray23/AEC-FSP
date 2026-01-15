
import { NextRequest, NextResponse } from 'next/server';
import { db, auth as adminAuth } from '@/lib/firebaseAdmin';
import type { Student } from '@/lib/types';
import { USER_ROLES, DEPARTMENTS } from '@/lib/constants';

const DEFAULT_PASSWORD = "Password@123";

function findValue(obj: any, keys: string[]): any {
    if (!obj) return undefined;
    const lowerCaseKeys = keys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
    for (const objKey in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, objKey)) {
            const lowerObjKey = objKey.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (lowerCaseKeys.includes(lowerObjKey)) {
                return obj[objKey];
            }
        }
    }
    return undefined;
}

function normalizeDepartment(input: string): string | undefined {
    if (!input) return undefined;
    const normalizedInput = String(input).trim().toLowerCase();
    for (const dept of DEPARTMENTS) {
        const lowerDeptValue = dept.value.toLowerCase();
        const lowerDeptLabel = dept.label.toLowerCase();
        if (lowerDeptValue === normalizedInput || lowerDeptLabel === normalizedInput) {
            return dept.value;
        }
        const abbreviationMatch = lowerDeptLabel.match(/\(([^)]+)\)/);
        if (abbreviationMatch && abbreviationMatch[1].trim().toLowerCase() === normalizedInput) {
            return dept.value;
        }
        const namePart = lowerDeptLabel.split('(')[0].trim();
        if (namePart === normalizedInput) {
            return dept.value;
        }
    }
    return undefined;
}

export async function POST(req: NextRequest) {
  if (!db || !adminAuth) {
    return NextResponse.json({ message: 'Firebase Admin SDK not initialized.' }, { status: 500 });
  }

  const { students: rawStudents } = await req.json();
  if (!Array.isArray(rawStudents)) {
    return NextResponse.json({ message: 'Request body must contain a "students" array.' }, { status: 400 });
  }

  const results = {
    successCount: 0,
    errorCount: 0,
    errors: [] as string[],
  };

  const validStudentsToCreate: (Omit<Student, 'id'> & { password?: string })[] = [];
  const existingEmails = new Set<string>();
  const existingStudentIds = new Set<string>();
  const existingRollNumbers = new Set<string>();

  const allStudentsSnapshot = await db.collection('students').get();
  allStudentsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.email) existingEmails.add(data.email.toLowerCase());
      if (data.studentId) existingStudentIds.add(data.studentId);
      if (data.rollNumber) existingRollNumbers.add(data.rollNumber);
  });

  for (const row of rawStudents) {
    if (!row) continue;

    const studentData = {
      name: String(findValue(row, ["Student Name"]) || '').trim(),
      studentId: String(findValue(row, ["Student ID"]) || '').trim(),
      rollNumber: String(findValue(row, ["University Roll No.", "University Roll No"]) || '').trim(),
      registrationNumber: String(findValue(row, ["University Registration No.", "University Registration No"]) || '').trim(),
      department: String(findValue(row, ["Department"]) || '').trim(),
      admissionYear: findValue(row, ["Admission Year"]),
      currentYear: findValue(row, ["Current Academic Year"]),
      email: String(findValue(row, ["Email"]) || '').trim(),
      whatsappNumber: String(findValue(row, ["WhatsApp No.", "WhatsApp No"]) || '').trim(),
      phoneNumber: String(findValue(row, ["Phone No.", "Phone No"]) || '').trim(),
    };

    const { name, studentId, email, rollNumber, registrationNumber, department: rawDepartment, admissionYear, currentYear, phoneNumber } = studentData;
    const normalizedDept = normalizeDepartment(rawDepartment);
    const admissionYearNum = parseInt(String(admissionYear), 10);
    const currentYearNum = parseInt(String(currentYear), 10);

    const addError = (msg: string) => {
        results.errorCount++;
        results.errors.push(msg);
    };

    if (!studentId || !name || !email || !rollNumber || !registrationNumber || !rawDepartment || !admissionYear || !currentYear || !phoneNumber) {
        addError(`Skipped row (Missing required data): Name: ${name || 'N/A'}, Roll: ${rollNumber || 'N/A'}`);
    } else if (!normalizedDept) {
        addError(`Skipped (Invalid department: "${rawDepartment}"): Name: ${name}, Roll: ${rollNumber}`);
    } else if (isNaN(admissionYearNum) || isNaN(currentYearNum)) {
        addError(`Skipped (Invalid year format): Name: ${name}, Admission: ${admissionYear}, Current: ${currentYear}`);
    } else if (existingEmails.has(email.toLowerCase())) {
        addError(`Skipped (Email already exists): ${email}`);
    } else if (existingStudentIds.has(studentId)) {
        addError(`Skipped (Student ID already exists): ${studentId}`);
    } else if (existingRollNumbers.has(rollNumber)) {
        addError(`Skipped (Roll Number already exists): ${rollNumber}`);
    } else {
        validStudentsToCreate.push({
            name, studentId, rollNumber, registrationNumber, phoneNumber,
            email: email.toLowerCase(),
            department: normalizedDept,
            admissionYear: admissionYearNum,
            currentYear: currentYearNum,
            whatsappNumber: studentData.whatsappNumber,
            role: USER_ROLES.STUDENT,
            isEmailVerified: true,
            isPhoneVerified: false,
            status: 'active',
            batchIds: [],
        });
        existingEmails.add(email.toLowerCase());
        existingStudentIds.add(studentId);
        existingRollNumbers.add(rollNumber);
    }
  }

  if (validStudentsToCreate.length === 0) {
    return NextResponse.json(results);
  }

  const creationPromises = validStudentsToCreate.map(async (student) => {
    try {
      const userRecord = await adminAuth.createUser({
        email: student.email,
        password: DEFAULT_PASSWORD,
        displayName: student.name,
        emailVerified: true,
      });

      const studentPayload: Omit<Student, 'id'> = { ...student, uid: userRecord.uid };
      await db.collection('students').doc(userRecord.uid).set(studentPayload);
      return { status: 'success' };
    } catch (error: any) {
      return { status: 'error', reason: `Failed for ${student.email}: ${error.message}` };
    }
  });

  const creationResults = await Promise.all(creationPromises);

  creationResults.forEach(result => {
    if (result.status === 'success') {
      results.successCount++;
    } else {
      results.errorCount++;
      results.errors.push(result.reason);
    }
  });

  return NextResponse.json(results);
}
