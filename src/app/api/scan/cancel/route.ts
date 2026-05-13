import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
  try {
    // Kill NAPS2.Console.exe to stop hardware scan immediately
    await execAsync('taskkill /F /IM NAPS2.Console.exe');
    return NextResponse.json({ success: true, message: 'Scan cancelled' });
  } catch (err: any) {
    // If process not found, it's still a success (already stopped)
    return NextResponse.json({ success: true, message: 'Scan not running' });
  }
}
