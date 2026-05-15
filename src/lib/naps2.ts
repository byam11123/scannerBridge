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
