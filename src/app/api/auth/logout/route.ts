import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = "session";

export async function POST(req: NextRequest) {
  try {
    cookies().delete(SESSION_COOKIE_NAME);
    return NextResponse.json({ message: 'Successfully logged out' });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
