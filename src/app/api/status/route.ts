import { NextResponse } from 'next/server';
import { isNAPS2Installed } from '@/lib/naps2';

export const dynamic = 'force-dynamic';

export async function GET() {
  const installed = isNAPS2Installed();
  console.log('NAPS2 Installation Check:', installed);
  
  if (installed) {
    return NextResponse.json({ status: 'online', engine: 'NAPS2' });
  } else {
    return NextResponse.json(
      { status: 'error', message: 'NAPS2 not found' },
      { status: 500 }
    );
  }
}
