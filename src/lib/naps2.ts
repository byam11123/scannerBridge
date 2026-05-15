import fs from 'fs';
import path from 'path';

const POSSIBLE_PATHS = [
  'C:\\Program Files\\NAPS2\\NAPS2.Console.exe',
  'C:\\Program Files (x86)\\NAPS2\\NAPS2.Console.exe',
  path.join(process.env.LOCALAPPDATA || '', 'NAPS2', 'NAPS2.Console.exe'),
  // Add other common paths if needed
];

export function getNAPS2Path(): string {
  for (const p of POSSIBLE_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  // Fallback to default if nothing found, but most routes will handle the error
  return POSSIBLE_PATHS[0];
}

export function isNAPS2Installed(): boolean {
  return POSSIBLE_PATHS.some(p => fs.existsSync(p));
}

export function humanizeScanError(error: string): string {
  const err = error.toLowerCase();
  
  if (err.includes('not ready')) return 'Scanner is not ready. Please check if it is turned on or connected.';
  if (err.includes('in use')) return 'Scanner is currently busy. Another app may be using it.';
  if (err.includes('paper empty') || err.includes('feeder is empty')) return 'The document feeder is empty. Please load your documents.';
  if (err.includes('communication failure') || err.includes('timeout')) return 'Communication failed. Please check the scanner connection (USB/WiFi).';
  if (err.includes('sleep mode')) return 'Scanner is in sleep mode. Try waking it up manually.';
  if (err.includes('offline')) return 'Scanner appears to be offline. Check its power and network status.';
  if (err.includes('invalid handle')) return 'Scanner driver error. Try restarting the scanner bridge app.';
  if (err.includes('access denied')) return 'Access denied. Please check permissions or restart the scanner.';
  
  if (err.includes('command failed')) {
    return 'Scanning failed. Ensure the scanner is connected, turned on, and not in use by another program.';
  }

  return error;
}
