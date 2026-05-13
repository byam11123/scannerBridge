import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
const NAPS2_PATH = 'C:\\Program Files\\NAPS2\\NAPS2.Console.exe';
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

    let scanResult: any = { stdout: '', stderr: '' };
    try {
      scanResult = await execAsync(command, { timeout: 180000 }); // Increase timeout to 3 mins
      if (scanResult.stdout.trim()) console.log('[stdout]', scanResult.stdout.trim());
      if (scanResult.stderr.trim()) console.error('[stderr]', scanResult.stderr.trim());
    } catch (err: any) {
      console.error('[scan error]', err.message);
      scanResult.stderr = err.message;
      // Continue to check if files were generated despite the non-zero exit code
    }

    const files = fs.readdirSync(SCAN_DIR);
    const matchedFiles = files
      .filter(f => f.startsWith(baseFilename) && f.endsWith(`.${format}`))
      .sort(); // Ensure pages are in order

    if (matchedFiles.length === 0) {
      const msg = (scanResult.stderr || scanResult.stdout || 'Scan failed to produce a file. Check if the scanner is connected, has paper in the feeder, and supports the selected resolution.').trim();
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
    }, 120000);

    return NextResponse.json({ 
      success: true, 
      pages: matchedFiles,
      format: format,
      timestamp: Date.now()
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
