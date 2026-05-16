import { corsResponse, handleOptions } from '@/lib/cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { getNAPS2Path, humanizeScanError } from '@/lib/naps2';

const execAsync = promisify(exec);
const NAPS2_PATH = getNAPS2Path();
const SCAN_DIR = 'C:\\scans';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      deviceName = '',
      driver = 'wia',
      dpi = 300,
      colorMode = 'Gray',
      paperSource = 'Feeder',
      pageSize = 'A4',
      format = 'jpg'
    } = body;

    if (!fs.existsSync(SCAN_DIR)) {
      fs.mkdirSync(SCAN_DIR, { recursive: true });
    }

    const baseFilename = `scan_${Date.now()}`;
    const outputPath = path.join(SCAN_DIR, `${baseFilename}_$(nnnn).${format}`);

    const args = [
      `-o "${outputPath}"`,
      `--noprofile`,
      `--driver ${driver}`,
      `--device "${deviceName.replace(/"/g, '')}"`,
      `--dpi ${parseInt(dpi)}`
    ];

    if (driver !== 'wia' || colorMode !== 'Color') {
      args.push(`--bitdepth ${colorMode === 'Color' ? 24 : (colorMode === 'Gray' ? 8 : 1)}`);
    }

    if (driver !== 'wia') {
      args.push(`--pagesize ${pageSize}`);
    }

    if (paperSource.toLowerCase() === 'feeder') args.push('--source feeder');
    else if (paperSource.toLowerCase() === 'flatbed') args.push('--source glass');
    else if (paperSource.toLowerCase() === 'duplex') args.push('--source duplex');

    const command = `"${NAPS2_PATH}" ${args.join(' ')}`;
    let scanResult = { stdout: '', stderr: '' };
    
    try {
      scanResult = await execAsync(command, { timeout: 180000 });
    } catch (err: any) {
      if (parseInt(dpi) !== 300) {
        const fallbackArgs = args.map(a => a.startsWith('--dpi') ? '--dpi 300' : a);
        const fallbackCommand = `"${NAPS2_PATH}" ${fallbackArgs.join(' ')}`;
        try {
          scanResult = await execAsync(fallbackCommand, { timeout: 180000 });
        } catch (fallbackErr: any) {
          scanResult.stderr = fallbackErr.message;
        }
      } else {
        scanResult.stderr = err.message;
      }
    }

    const files = fs.readdirSync(SCAN_DIR);
    const matchedFiles = files
      .filter(f => f.startsWith(baseFilename) && f.endsWith(`.${format}`))
      .sort(); 

    if (matchedFiles.length === 0) {
      const rawError = (scanResult.stderr || scanResult.stdout || 'Scan failed.').trim();
      return corsResponse({ error: humanizeScanError(rawError) }, 500);
    }

    return corsResponse({ 
      success: true, 
      pages: matchedFiles,
      format: format,
      timestamp: Date.now()
    });
  } catch (err: any) {
    return corsResponse({ error: humanizeScanError(err.message) }, 500);
  }
}
