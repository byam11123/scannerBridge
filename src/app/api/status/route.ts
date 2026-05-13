import { NextResponse } from 'next/server';
import fs from 'fs';

const NAPS2_PATH = 'C:\\Program Files\\NAPS2\\NAPS2.Console.exe';

export async function GET() {
  if (fs.existsSync(NAPS2_PATH)) {
    return NextResponse.json({ status: 'online', engine: 'NAPS2' });
  } else {
    return NextResponse.json(
      { status: 'error', message: 'NAPS2 not found' },
      { status: 500 }
    );
  }
}
