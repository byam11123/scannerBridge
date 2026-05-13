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
      pages = [],
      format = 'pdf',
      ocr = false,
      deskew = false,
      email = null
    } = body;

    if (pages.length === 0) {
      return NextResponse.json({ error: 'No pages selected' }, { status: 400 });
    }

    const outputFilename = `final_${Date.now()}.${format}`;
    const outputPath = path.join(SCAN_DIR, outputFilename);

    // Build NAPS2 Command
    const args = [
      `-o "${outputPath}"`,
      `--noprofile`,
      `--force`
    ];

    // Add input files (in order)
    pages.forEach((p: string) => {
      args.push(`-i "${path.join(SCAN_DIR, p)}"`);
    });

    if (ocr) args.push('--enableocr');
    if (deskew) args.push('--deskew');

    // Email handling
    if (email && email.to) {
      args.push(`-e "${outputFilename}"`);
      args.push(`--to "${email.to}"`);
      if (email.subject) args.push(`--subject "${email.subject}"`);
      if (email.body) args.push(`--body "${email.body}"`);
      // Note: NAPS2 might require GUI interaction for email unless configured.
      // We'll use --autosend for silent-ish send if possible.
      args.push('--autosend');
    }

    const command = `"${NAPS2_PATH}" ${args.join(' ')}`;
    console.log('[save command]', command);

    await execAsync(command, { timeout: 180000 });

    if (!fs.existsSync(outputPath)) {
      return NextResponse.json({ error: 'Failed to generate output file' }, { status: 500 });
    }

    // Read the final file to return it
    const fileBuffer = fs.readFileSync(outputPath);
    
    // Cleanup the final file after 2 mins
    setTimeout(() => {
      try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
    }, 120000);

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': format === 'pdf' ? 'application/pdf' : 'image/jpeg',
        'Content-Disposition': `attachment; filename="${outputFilename}"`,
        'X-Filename': outputFilename
      },
    });

  } catch (err: any) {
    console.error('[save error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
