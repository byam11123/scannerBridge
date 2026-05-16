import { NextResponse } from 'next/server';
import { isNAPS2Installed } from '@/lib/naps2';

export const dynamic = 'force-dynamic';

export async function GET() {
  const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  const installed = isNAPS2Installed();
  
  if (installed) {
    return NextResponse.json({ status: 'online', engine: 'NAPS2', environment: 'local' });
  } else if (isVercel) {
    return NextResponse.json({ 
      status: 'cloud', 
      message: 'Running in cloud mode. To use the scanner, you must run this application locally on your computer.',
      environment: 'vercel'
    });
  } else {
    return NextResponse.json(
      { status: 'error', message: 'NAPS2 not found. Please install NAPS2 to use the scanner.' },
      { status: 200 } // Return 200 so the frontend can handle the message without a crash
    );
  }
}
