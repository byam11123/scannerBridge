import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { isNAPS2Installed } from '@/lib/naps2';

const execAsync = promisify(exec);

const MSI_URL = 'https://github.com/cyanfish/naps2/releases/download/v8.2.1/naps2-8.2.1-win-x64.msi';

export async function POST() {
  const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  
  if (isVercel) {
    return NextResponse.json(
      { success: false, error: 'Automatic installation is not available in cloud mode. Please run this application locally on your Windows computer to set up the scanner.' },
      { status: 200 }
    );
  }

  try {
    // 1. Check if already installed
    if (isNAPS2Installed()) {
      return NextResponse.json({ success: true, message: 'NAPS2 is already installed.' });
    }

    // 2. Prepare temp path
    const tempDir = os.tmpdir();
    const msiPath = path.join(tempDir, 'naps2_installer.msi');

    console.log('Downloading NAPS2 installer...');
    const response = await fetch(MSI_URL);
    if (!response.ok) throw new Error('Failed to download NAPS2 installer');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(msiPath, buffer);

    console.log('Running silent installation...');
    // /qn = quiet, no UI
    // /norestart = do not restart
    const { stderr } = await execAsync(`msiexec /i "${msiPath}" /qn /norestart`);
    
    if (stderr && !stderr.includes('warning')) {
      console.warn('Installation stderr:', stderr);
    }

    // 3. Verify installation
    // Wait a bit for the system to register the new files
    await new Promise(r => setTimeout(r, 2000));
    
    if (isNAPS2Installed()) {
      return NextResponse.json({ success: true, message: 'NAPS2 installed successfully.' });
    } else {
      throw new Error('Installation finished but NAPS2 was not detected. You may need to restart the application.');
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during installation.';
    console.error('Install error:', error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
