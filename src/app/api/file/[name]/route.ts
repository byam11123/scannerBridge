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

  const { searchParams } = new URL(req.url);
  const download = searchParams.get('download') === 'true';

  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(name).toLowerCase();
  const contentType = ext === '.pdf' ? 'application/pdf' : 'image/jpeg';

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=60',
  };

  if (download) {
    headers['Content-Disposition'] = `attachment; filename="${name}"`;
  }

  return new Response(fileBuffer, { headers });
}
