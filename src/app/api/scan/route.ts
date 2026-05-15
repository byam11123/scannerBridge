import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

import { getNAPS2Path, humanizeScanError } from '@/lib/naps2';

const execAsync = promisify(exec);
const NAPS2_PATH = getNAPS2Path();
const SCAN_DIR = 'C:\\scans';

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

    // NAPS2 Arguments - Optimized for compatibility
    const args = [
      `-o "${outputPath}"`,
      `--noprofile`,
      `--driver ${driver}`,
      `--device "${deviceName.replace(/"/g, '')}"`,
      `--dpi ${parseInt(dpi)}`
    ];

    // Only add bitdepth if not using WIA or if specifically requested (WIA 1.0 can be picky)
    if (driver !== 'wia' || colorMode !== 'Color') {
      args.push(`--bitdepth ${colorMode === 'Color' ? 24 : (colorMode === 'Gray' ? 8 : 1)}`);
    }

    // Only add pagesize if not using WIA (some WIA drivers fail with explicit pagesize)
    if (driver !== 'wia') {
      args.push(`--pagesize ${pageSize}`);
    }

    // Paper source mapping
    if (paperSource.toLowerCase() === 'feeder') args.push('--source feeder');
    else if (paperSource.toLowerCase() === 'flatbed') args.push('--source glass');
    else if (paperSource.toLowerCase() === 'duplex') args.push('--source duplex');

    const command = `"${NAPS2_PATH}" ${args.join(' ')}`;
    console.log('[scan command]', command);

    let scanResult = { stdout: '', stderr: '' };
    try {
      scanResult = await execAsync(command, { timeout: 180000 });
      if (scanResult.stdout.trim()) console.log('[stdout]', scanResult.stdout.trim());
      if (scanResult.stderr.trim()) console.error('[stderr]', scanResult.stderr.trim());
    } catch (err) {
      const error = err as Error;
      console.error('[scan error primary]', error.message);
      
      // Smart Fallback: If 200 or 400 DPI fails, many WIA drivers only support 300
      if (parseInt(dpi) !== 300) {
        console.log('[scan fallback] Retrying at 300 DPI...');
        const fallbackArgs = args.map(a => a.startsWith('--dpi') ? '--dpi 300' : a);
        const fallbackCommand = `"${NAPS2_PATH}" ${fallbackArgs.join(' ')}`;
        
        try {
          scanResult = await execAsync(fallbackCommand, { timeout: 180000 });
          console.log('[scan fallback success] 300 DPI worked.');
        } catch (fallbackErr) {
          const fallbackError = fallbackErr as Error;
          console.error('[scan error fallback]', fallbackError.message);
          scanResult.stderr = fallbackError.message;
        }
      } else {
        scanResult.stderr = error.message;
      }
    }

    const files = fs.readdirSync(SCAN_DIR);
    const matchedFiles = files
      .filter(f => f.startsWith(baseFilename) && f.endsWith(`.${format}`))
      .sort(); 

    if (matchedFiles.length === 0) {
      const rawError = (scanResult.stderr || scanResult.stdout || 'Scan failed.').trim();
      const msg = humanizeScanError(rawError);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // Cleanup logic (delayed - increased to 2 minutes to allow grid viewing)
    setTimeout(() => {
      try {
        const currentFiles = fs.readdirSync(SCAN_DIR);
        currentFiles.forEach(f => {
          if (f.startsWith(baseFilename)) {
            try { fs.unlinkSync(path.join(SCAN_DIR, f)); } catch {}
          }
        });
      } catch (e) {
        console.error('[cleanup error]', e);
      }
    }, 600000);

    return NextResponse.json({ 
      success: true, 
      pages: matchedFiles,
      format: format,
      timestamp: Date.now()
    });

  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: humanizeScanError(error.message) }, { status: 500 });
  }
}
