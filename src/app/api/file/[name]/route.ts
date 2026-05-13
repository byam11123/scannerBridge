import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SCAN_DIR = 'C:\\scans';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const filePath = path.join(SCAN_DIR, name);

  if (!fs.existsSync(filePath)) {
    return new Response('File not found', { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(name).toLowerCase();
  const contentType = ext === '.pdf' ? 'application/pdf' : 'image/jpeg';

  return new Response(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=60',
    },
  });
}
