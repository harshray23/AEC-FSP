
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
      return NextResponse.json({ 
        message: 'Backend Authentication Service is unavailable. Please ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set.' 
      }, { status: 500 });
    }

    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    const isProd = process.env.NODE_ENV === "production";
    
    const cookieStore = cookies();
    cookieStore.set({
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      httpOnly: true,
      maxAge: expiresIn / 1000,
      path: "/",
      sameSite: "Lax" as const,
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
