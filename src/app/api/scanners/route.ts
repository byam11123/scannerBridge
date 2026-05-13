import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const NAPS2_PATH = 'C:\\Program Files\\NAPS2\\NAPS2.Console.exe';

export async function GET() {
  const drivers = ['wia', 'twain', 'escl'];
  let allScanners: { name: string; driver: string }[] = [];

  for (const driver of drivers) {
    try {
      const { stdout } = await execAsync(`"${NAPS2_PATH}" --listdevices --driver ${driver}`);
      const output = stdout.trim();
      
      if (output) {
        const names = output.split('\n').map(n => n.trim()).filter(n => n);
        names.forEach(name => {
          allScanners.push({ name, driver });
        });
      }
    } catch (err: any) {
      console.error(`[discovery error] ${driver}:`, err.message);
    }
  }

  return NextResponse.json({ scanners: allScanners });
}
