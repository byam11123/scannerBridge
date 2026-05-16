import { NextResponse } from 'next/server';
import { isNAPS2Installed } from '@/lib/naps2';

export async function GET() {
  if (isNAPS2Installed()) {
    return NextResponse.json({ status: 'online', engine: 'NAPS2' });
  } else {
    return NextResponse.json(
      { status: 'error', message: 'NAPS2 not found' },
      { status: 500 }
    );
  }
}
