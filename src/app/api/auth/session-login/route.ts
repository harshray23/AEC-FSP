
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebaseAdmin';

const SESSION_COOKIE_NAME = "session";
const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();

  if (!idToken) {
    return NextResponse.json({ message: 'ID token is required.' }, { status: 400 });
  }

  try {
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    const isProd = process.env.NODE_ENV === "production";
    
    const options = {
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      httpOnly: true,
      maxAge: expiresIn / 1000,
      path: "/",
      sameSite: "Lax" as const,
      secure: isProd,
    };

    const response = NextResponse.json({ message: 'Session created successfully.' });
    response.cookies.set(options);
    
    return response;
  } catch (error) {
    console.error('Session login error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
