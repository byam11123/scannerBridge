import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getNAPS2Path } from '@/lib/naps2';

const execAsync = promisify(exec);
const NAPS2_PATH = getNAPS2Path();

interface Scanner {
  name: string;
  driver: string;
}

// Cache variables (Global across requests in the same worker)
let scannerCache: Scanner[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 600000; // 10 minutes

export async function GET(req: Request) {
  try {
    // Check if forced refresh
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!forceRefresh && scannerCache && (Date.now() - lastFetchTime < CACHE_DURATION)) {
      console.log('[scanners] Serving from cache');
      return NextResponse.json({ scanners: scannerCache, cached: true });
    }

    const drivers = ['wia', 'twain', 'escl'];
    const allScanners: Scanner[] = [];

    for (const driver of drivers) {
      try {
        const { stdout } = await execAsync(`"${NAPS2_PATH}" --listdevices --driver ${driver}`);
        const output = stdout.trim();
        
        if (output) {
          const names = output.split('\n').map(n => n.trim()).filter(n => n);
          names.forEach(name => {
            allScanners.push({ name, driver });
          });
        }
      } catch (err) {
        const error = err as Error;
        console.error(`[discovery error] ${driver}:`, error.message);
      }
    }

    scannerCache = allScanners;
    lastFetchTime = Date.now();

    return NextResponse.json({ scanners: allScanners, cached: false });
  } catch (err) {
    const error = err as Error;
    console.error('[scanners error]', error.message);
    return NextResponse.json({ 
      scanners: scannerCache || [], // Return cache if available even if it's expired
      error: error.message,
      usingFallback: true 
    });
  }
}
