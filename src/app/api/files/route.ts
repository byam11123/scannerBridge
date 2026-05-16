import { corsResponse, handleOptions } from '@/lib/cors';
import fs from 'fs';
import path from 'path';

const SCAN_DIR = 'C:\\scans';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  try {
    if (!fs.existsSync(SCAN_DIR)) {
      return corsResponse({ files: [] });
    }

    const files = fs.readdirSync(SCAN_DIR);
    const scanFiles = files
      .filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.pdf'].includes(ext);
      })
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(SCAN_DIR, f)).mtimeMs
      }))
      .sort((a, b) => a.time - b.time)
      .map(f => f.name);

    return corsResponse({ files: scanFiles });
  } catch (err: any) {
    console.error('Failed to list files:', err);
    return corsResponse({ error: 'Failed to list files' }, 500);
  }
}
