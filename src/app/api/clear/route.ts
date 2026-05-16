import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SCAN_DIR = 'C:\\scans';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { filenames = [], clearAll = false } = body;

    if (!fs.existsSync(SCAN_DIR)) {
      return NextResponse.json({ success: true });
    }

    const filesOnDisk = fs.readdirSync(SCAN_DIR);

    if (clearAll) {
      // DANGEROUS: Only use if you really want to wipe EVERYTHING in C:\scans
      // For now, let's just clear files starting with 'scan_' or 'import_' or 'rot_'
      filesOnDisk.forEach(f => {
        if (f.startsWith('scan_') || f.startsWith('import_') || f.startsWith('rot_')) {
          try { fs.unlinkSync(path.join(SCAN_DIR, f)); } catch {}
        }
      });
    } else {
      filenames.forEach((name: string) => {
        // Delete the original file
        const filePath = path.join(SCAN_DIR, name);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch {}
        }

        // Also delete any rotated versions of this file
        filesOnDisk.forEach(f => {
          if (f.includes(name) && f.startsWith('rot_')) {
            try { fs.unlinkSync(path.join(SCAN_DIR, f)); } catch {}
          }
        });
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
