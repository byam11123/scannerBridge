import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SCAN_DIR = 'C:\\scans';

export async function GET() {
  try {
    if (!fs.existsSync(SCAN_DIR)) {
      return NextResponse.json({ files: [] });
    }

    const files = fs.readdirSync(SCAN_DIR);
    
    // Only return image files that look like scans or uploads
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

    return NextResponse.json({ files: scanFiles });
  } catch (err) {
    console.error('Failed to list files:', err);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}
