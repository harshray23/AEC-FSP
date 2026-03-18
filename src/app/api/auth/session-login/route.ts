
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebaseAdmin';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = "session";
const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json({ message: 'ID token is required.' }, { status: 400 });
    }

    if (!auth) {
      // In development/prototype environments, we log a warning but don't crash.
      // This allows the client-side login (which is already successful) to proceed.
      console.warn("Firebase Admin Auth not initialized. Skipping session cookie creation.");
      return NextResponse.json({ 
        message: 'Session cookie skipped: Backend Auth not initialized.',
        warning: true
      }, { status: 200 });
    }

    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    const isProd = process.env.NODE_ENV === "production";
    
    const cookieStore = cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      maxAge: expiresIn / 1000,
      path: "/",
      sameSite: "lax",
      secure: isProd,
    });
    
    return NextResponse.json({ message: 'Session created successfully.' });
  } catch (error: any) {
    console.error('Session login error:', error);
    return NextResponse.json({ 
      message: error.message || 'An unexpected error occurred while creating the session.' 
    }, { status: 500 });
  }
}
