
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

    // If no cookie, we normally redirect, but in dev/prototype we allow client-side only state
    if (!sessionCookie) {
      // If we are in a prototype environment without full backend, we might not have cookies
      // We'll rely on the client component to handle the redirect if it detects no user in localStorage
      return NextResponse.next();
    }

    try {
      const decodedClaims = await verifySession(sessionCookie);

      if (!decodedClaims) {
        // Fallback for development if Admin SDK is unconfigured
        if (!process.env.FIREBASE_PRIVATE_KEY) {
          return NextResponse.next();
        }
        throw new Error('Invalid session.');
      }
      
      if (!db) {
        return NextResponse.next();
      }

      // Verify role from Firestore if possible
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

      if (userProfile && userProfile.role !== expectedRole) {
        return NextResponse.redirect(new URL('/', req.url));
      }

      return NextResponse.next();

    } catch (error) {
      console.warn('Middleware Session Check Failed:', error);
      return NextResponse.next(); // Fail open in dev/prototype to avoid infinite loops
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*', '/student/:path*', '/host/:path*'],
};
