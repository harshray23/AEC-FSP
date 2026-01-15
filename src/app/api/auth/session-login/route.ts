
import { createSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();

  if (!idToken) {
    return NextResponse.json({ message: 'ID token is required.' }, { status: 400 });
  }

  try {
    const response = NextResponse.json({ message: 'Session created successfully.' });
    await createSession(idToken, response as any); // TODO: Fix type
    return response;
  } catch (error) {
    console.error('Session login error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
