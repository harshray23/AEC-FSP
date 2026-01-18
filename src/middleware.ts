// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';
import { db } from '@/lib/firebaseAdmin';

// Force Node.js runtime instead of Edge to use Firebase Admin SDK
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

  // Determine if the current path is a protected route
  const protectedPath = Object.keys(PROTECTED_ROUTES).find(p => pathname.startsWith(p));

  if (protectedPath) {
    const expectedRole = PROTECTED_ROUTES[protectedPath as keyof typeof PROTECTED_ROUTES];
    const loginUrl = new URL(`/login?role=${expectedRole}`, req.url);

    if (!sessionCookie) {
      return NextResponse.redirect(loginUrl);
    }

    try {
      const decodedClaims = await verifySession(sessionCookie);

      if (!decodedClaims) {
        throw new Error('Session verification failed, no claims found.');
      }
      
      // Fetch user profile from Firestore to verify the role from a trusted source
      let userProfile = null;
      if (db) {
          // Check all possible user collections
          const collections = ['students', 'teachers', 'admins', 'hosts'];
          for (const collection of collections) {
              const docRef = db.collection(collection).doc(decodedClaims.uid);
              const doc = await docRef.get();
              if (doc.exists) {
                  userProfile = doc.data();
                  break;
              }
          }
      } else {
          throw new Error('Database connection is not available in middleware.');
      }

      if (!userProfile) {
        throw new Error(`User profile not found in database for UID: ${decodedClaims.uid}`);
      }

      if (userProfile.role !== expectedRole) {
        // If roles don't match, redirect to the root page. This prevents a student from accessing an admin URL.
        return NextResponse.redirect(new URL('/', req.url));
      }

      // If everything is fine, proceed to the requested page
      return NextResponse.next();

    } catch (error) {
      // Any error in verification means the session is invalid.
      console.error('Middleware verification error:', error);
      // Clear the invalid cookie and redirect to login.
      const res = NextResponse.redirect(loginUrl);
      res.cookies.set('session', '', { maxAge: -1, path: '/' });
      return res;
    }
  }

  // Allow the request to proceed for public routes
  return NextResponse.next();
}

// Define which paths the middleware should run on
export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*', '/student/:path*', '/host/:path*'],
};
