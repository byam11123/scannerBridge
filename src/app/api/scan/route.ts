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

    const filename = `scan_${Date.now()}.${format}`;
    const outputPath = path.join(SCAN_DIR, filename);

    // NAPS2 Arguments
    const args = [
      `-o "${outputPath}"`,
      `--noprofile`,
      `--driver ${driver}`,
      `--device "${deviceName.replace(/"/g, '')}"`,
      `--dpi ${parseInt(dpi)}`,
      `--bitdepth ${colorMode === 'Color' ? 24 : (colorMode === 'Gray' ? 8 : 1)}`,
      `--pagesize ${pageSize}`
    ];

    // Paper source mapping
    if (paperSource.toLowerCase() === 'feeder') args.push('--source feeder');
    else if (paperSource.toLowerCase() === 'flatbed') args.push('--source glass');
    else if (paperSource.toLowerCase() === 'duplex') args.push('--source duplex');

    const command = `"${NAPS2_PATH}" ${args.join(' ')}`;
    console.log('[scan command]', command);

    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 120000 });
      if (stdout.trim()) console.log('[stdout]', stdout.trim());
      if (stderr.trim()) console.error('[stderr]', stderr.trim());
    } catch (err: any) {
      // Even if it "errors", NAPS2 might have succeeded (e.g. multi-page output naming)
      console.error('[scan error]', err.message);
    }

    const files = fs.readdirSync(SCAN_DIR);
    const base = filename.split(`.${format}`)[0];
    const matchedFiles = files
      .filter(f => f.startsWith(base) && f.endsWith(`.${format}`))
      .sort(); // Ensure pages are in order

    if (matchedFiles.length === 0) {
      const msg = (stderr || stdout || err?.message || 'Scan failed to produce a file. Check if the scanner is connected and has paper.').trim();
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // Cleanup logic (delayed - increased to 2 minutes to allow grid viewing)
    setTimeout(() => {
      try {
        const currentFiles = fs.readdirSync(SCAN_DIR);
        currentFiles.forEach(f => {
          if (f.startsWith(base)) {
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
