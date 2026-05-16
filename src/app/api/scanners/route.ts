import { corsResponse, handleOptions } from '@/lib/cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getNAPS2Path } from '@/lib/naps2';

const execAsync = promisify(exec);
const NAPS2_PATH = getNAPS2Path();

export const dynamic = 'force-dynamic';

interface Scanner {
  name: string;
  driver: string;
}

// Cache variables
let scannerCache: Scanner[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 600000;

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!forceRefresh && scannerCache && (Date.now() - lastFetchTime < CACHE_DURATION)) {
      return corsResponse({ scanners: scannerCache, cached: true });
    }

    const drivers = ['wia', 'twain', 'escl'];
    const allScanners: Scanner[] = [];

    for (const driver of drivers) {
      try {
        const { stdout } = await execAsync(`"${NAPS2_PATH}" --listdevices --driver ${driver}`);
        const output = stdout.trim();
        if (output) {
          output.split('\n').map(n => n.trim()).filter(n => n).forEach(name => {
            allScanners.push({ name, driver });
          });
        }
      } catch (err: any) {
        console.error(`[discovery error] ${driver}:`, err.message);
      }
    }

    scannerCache = allScanners;
    lastFetchTime = Date.now();
    return corsResponse({ scanners: allScanners, cached: false });
  } catch (err: any) {
    console.error('[scanners error]', err.message);
    return corsResponse({ 
      scanners: scannerCache || [], 
      error: err.message,
      usingFallback: true 
    });
  }
}
