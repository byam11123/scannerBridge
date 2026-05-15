import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
// @ts-expect-error archiver types are outdated for v8
import { ZipArchive } from 'archiver';

import { getNAPS2Path } from '@/lib/naps2';

import sharp from 'sharp';

const execAsync = promisify(exec);
const NAPS2_PATH = getNAPS2Path();
const SCAN_DIR = 'C:\\scans';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      pages = [], // Array of { name: string, rotation: number }
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

    // Ensure we don't return an old file if the new one fails
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    // Phase 1: Process individual pages (Rotation)
    const processedPages = [];
    for (const page of pages) {
      const inputPath = path.join(SCAN_DIR, page.name);
      
      if (!fs.existsSync(inputPath)) {
        console.error(`[save error] File not found: ${inputPath}`);
        continue;
      }

      // If rotation is needed, create a temporary rotated version
      if (page.rotation !== 0) {
        const rotatedName = `rot_${page.rotation}_${page.name}`;
        const rotatedPath = path.join(SCAN_DIR, rotatedName);
        
        await sharp(inputPath)
          .rotate(page.rotation)
          .toFile(rotatedPath);
          
        processedPages.push(rotatedName);
      } else {
        processedPages.push(page.name);
      }
    }

    if (processedPages.length === 0) {
      return NextResponse.json({ error: 'No valid input files found. They may have been cleaned up (10 min limit).' }, { status: 400 });
    }

    // Give the OS a moment to release file handles
    await new Promise(r => setTimeout(r, 500));

    // Build NAPS2 Command
    const args = [
      `-o "${outputPath}"`,
      `--force`,
      `--verbose`,
      `--noprofile`,
      `-n 0`
    ];

    // Add input files (NAPS2 uses semicolon-separated list for -i)
    const importList = processedPages.map(p => path.join(SCAN_DIR, p)).join(';');
    args.push(`-i "${importList}"`);

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

    let saveResult = { stdout: '', stderr: '' };
    try {
      saveResult = await execAsync(command, { timeout: 180000 });
      if (saveResult.stdout.trim()) console.log('[save stdout]', saveResult.stdout.trim());
      if (saveResult.stderr.trim()) console.error('[save stderr]', saveResult.stderr.trim());
    } catch (err: unknown) {
      const error = err as Error;
      console.error('[save error]', error.message);
      saveResult.stderr = error.message;
    }

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      // Check if NAPS2 created numbered files (e.g., for multiple JPGs)
      const baseName = path.basename(outputPath, `.${format}`);
      const files = fs.readdirSync(SCAN_DIR).filter(f => f.startsWith(baseName) && f.endsWith(`.${format}`));
      
      if (files.length > 0) {
        if (files.length === 1) {
          // Just use the one file it created (maybe it added a suffix)
          const actualPath = path.join(SCAN_DIR, files[0]);
          const fileBuffer = fs.readFileSync(actualPath);
          return new NextResponse(fileBuffer, {
            headers: {
              'Content-Type': format === 'pdf' ? 'application/pdf' : 'image/jpeg',
              'Content-Disposition': `attachment; filename="${outputFilename}"`
            }
          });
        } else {
          // Multiple files (common for JPG). Zip them.
          const zipFilename = `scans_${Date.now()}.zip`;
          const zipPath = path.join(SCAN_DIR, zipFilename);
          const output = fs.createWriteStream(zipPath);
          const archive = new ZipArchive({ zlib: { level: 9 } });

          const zipPromise = new Promise<void>((resolve, reject) => {
            output.on('close', () => resolve());
            archive.on('error', (err: unknown) => reject(err));
          });

          archive.pipe(output);
          files.forEach(f => {
            archive.file(path.join(SCAN_DIR, f), { name: f });
          });
          await archive.finalize();
          await zipPromise;

          const zipBuffer = fs.readFileSync(zipPath);
          
          // Cleanup zip
          setTimeout(() => { try { fs.unlinkSync(zipPath); } catch {} }, 60000);

          return new NextResponse(zipBuffer, {
            headers: {
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="${zipFilename}"`
            }
          });
        }
      }

      const msg = (saveResult.stderr || saveResult.stdout || 'Save failed. The PDF engine produced an empty file.').trim();
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const fileBuffer = fs.readFileSync(outputPath);
    
    // Cleanup the final file after a short delay
    setTimeout(() => {
      try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
    }, 60000);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': format === 'pdf' ? 'application/pdf' : 'image/jpeg',
        'Content-Disposition': `attachment; filename="${outputFilename}"`
      }
    });
  } catch (err) {
    const error = err as Error;
    console.error('[save error]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
