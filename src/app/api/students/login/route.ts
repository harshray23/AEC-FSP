
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  return NextResponse.json({ message: "This API endpoint is deprecated." }, { status: 404 });
}
