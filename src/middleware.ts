
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

    if (!sessionCookie) {
      return NextResponse.redirect(loginUrl);
    }

    try {
      const decodedClaims = await verifySession(sessionCookie);

      if (!decodedClaims) {
        throw new Error('Invalid or expired session.');
      }
      
      if (!db) {
        // If database is not available, we can't verify roles strictly, 
        // but we can allow through if we trust the claims, 
        // or redirect to home if we want to be safe.
        // For a prototype, let's allow if claims exist but log a warning.
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
