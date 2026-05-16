import { corsResponse, handleOptions } from '@/lib/cors';
import fs from 'fs';
import path from 'path';

const SCAN_DIR = 'C:\\scans';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { filenames = [], clearAll = false } = body;

    if (!fs.existsSync(SCAN_DIR)) {
      return corsResponse({ success: true });
    }

    const filesOnDisk = fs.readdirSync(SCAN_DIR);

    if (clearAll) {
      filesOnDisk.forEach(f => {
        if (f.startsWith('scan_') || f.startsWith('import_') || f.startsWith('rot_')) {
          try { fs.unlinkSync(path.join(SCAN_DIR, f)); } catch {}
        }
      });
    } else {
      filenames.forEach((name: string) => {
        const filePath = path.join(SCAN_DIR, name);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch {}
        }
        filesOnDisk.forEach(f => {
          if (f.includes(name) && f.startsWith('rot_')) {
            try { fs.unlinkSync(path.join(SCAN_DIR, f)); } catch {}
          }
        });
      });
    }

    return corsResponse({ success: true });
  } catch (err: any) {
    return corsResponse({ error: err.message }, 500);
  }
}
