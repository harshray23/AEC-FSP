
import { deleteSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    cookieStore.delete('session');
    return NextResponse.json({ message: 'Successfully logged out' });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
