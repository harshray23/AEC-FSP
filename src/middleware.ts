
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';
import { db } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

const PROTECTED_ROUTES = {
  '/admin': 'admin',
  '/teacher': 'teacher',
  '/student': 'student',
  '/host': 'host',
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get('session')?.value;

  const protectedPath = Object.keys(PROTECTED_ROUTES).find(p => pathname.startsWith(p));

  if (protectedPath) {
    const expectedRole = PROTECTED_ROUTES[protectedPath as keyof typeof PROTECTED_ROUTES];
    const loginUrl = new URL(`/login?role=${expectedRole}`, req.url);

    // If no cookie, redirect to login
    if (!sessionCookie) {
      return NextResponse.redirect(loginUrl);
    }

    try {
      const decodedClaims = await verifySession(sessionCookie);

      if (!decodedClaims) {
        // If verifySession returns null because Admin SDK is missing, we allow through in dev
        if (!process.env.FIREBASE_PRIVATE_KEY) {
          console.warn('Middleware: FIREBASE_PRIVATE_KEY missing. Bypassing strict verification.');
          return NextResponse.next();
        }
        throw new Error('Invalid or expired session.');
      }
      
      if (!db) {
        console.warn('Database not available in middleware for role verification.');
        return NextResponse.next();
      }

      // verify role from Firestore
      const collections = ['students', 'teachers', 'admins', 'hosts'];
      let userProfile = null;
      
      for (const collection of collections) {
          const docRef = db.collection(collection).doc(decodedClaims.uid);
          const doc = await docRef.get();
          if (doc.exists) {
              userProfile = doc.data();
              break;
          }
      }

      if (!userProfile || userProfile.role !== expectedRole) {
        return NextResponse.redirect(new URL('/', req.url));
      }

      return NextResponse.next();

    } catch (error) {
      console.error('Middleware Error:', error);
      // Only clear and redirect if we actually had a cookie that failed validation
      const res = NextResponse.redirect(loginUrl);
      res.cookies.set('session', '', { maxAge: -1, path: '/' });
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*', '/student/:path*', '/host/:path*'],
};
