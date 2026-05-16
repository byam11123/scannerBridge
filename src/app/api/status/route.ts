import { corsResponse, handleOptions } from '@/lib/cors';
import { isNAPS2Installed } from '@/lib/naps2';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  const installed = isNAPS2Installed();
  
  if (installed) {
    return corsResponse({ status: 'online', engine: 'NAPS2', environment: 'local' });
  } else if (isVercel) {
    return corsResponse({ 
      status: 'cloud', 
      message: 'Running in cloud mode. To use the scanner, you must run this application locally on your computer.',
      environment: 'vercel'
    });
  } else {
    return corsResponse(
      { status: 'error', message: 'NAPS2 not found. Please install NAPS2 to use the scanner.' },
      200
    );
  }
}
