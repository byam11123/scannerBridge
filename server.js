// server.js - Canon Scanner Bridge (fixed)
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3001;
const SCAN_DIR = 'C:\\scans';

const NAPS2_PATH = 'C:\\Program Files\\NAPS2\\NAPS2.Console.exe';

app.use(cors());
app.use(express.json());

// Serve public folder (index.html lives here)
app.use(express.static(path.join(__dirname, 'public')));

if (!fs.existsSync(SCAN_DIR)) fs.mkdirSync(SCAN_DIR, { recursive: true });

// ── GET /api/scanners ─────────────────────────────────────────────────────────
app.get('/api/scanners', async (req, res) => {
  const drivers = ['wia', 'twain', 'escl'];
  let allScanners = [];

  for (const driver of drivers) {
    try {
      const output = await new Promise((resolve, reject) => {
        exec(`"${NAPS2_PATH}" --listdevices --driver ${driver}`, (err, stdout) => {
          if (err && !stdout) return reject(err);
          resolve(stdout.trim());
        });
      });
      
      if (output) {
        const names = output.split('\n').map(n => n.trim()).filter(n => n);
        names.forEach(name => {
          allScanners.push({ name, driver });
        });
      }
    } catch (err) {
      console.error(`[discovery error] ${driver}:`, err.message);
    }
  }

  console.log('[scanners found]', allScanners);
  res.json({ scanners: allScanners });
});

// ── GET /api/status ───────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  // Simplistic status: check if NAPS2 is accessible
  if (fs.existsSync(NAPS2_PATH)) {
    res.json({ status: 'online', engine: 'NAPS2' });
  } else {
    res.json({ status: 'error', message: 'NAPS2 not found' });
  }
});

// ── POST /api/scan ────────────────────────────────────────────────────────────
app.post('/api/scan', (req, res) => {
  const {
    deviceName = '',
    driver = 'wia',
    dpi = 300,
    colorMode = 'Gray',
    paperSource = 'Feeder',
    pageSize = 'A4',
    format = 'jpg'
  } = req.body;

  const filename = `scan_${Date.now()}.${format}`;
  const outputPath = path.join(SCAN_DIR, filename);

  // NAPS2 Arguments
  const args = [
    `-o "${outputPath}"`,
    `--noprofile`,
    `--driver ${driver}`,
    `--device "${deviceName.replace(/"/g, '')}"`,
    `--dpi ${parseInt(dpi)}`,
    `--bitdepth ${colorMode === 'Color' ? 24 : (colorMode === 'Gray' ? 8 : 1)}`,
  ];

  // Paper source mapping
  if (paperSource.toLowerCase() === 'feeder') args.push('--source feeder');
  else if (paperSource.toLowerCase() === 'flatbed') args.push('--source glass');
  else if (paperSource.toLowerCase() === 'duplex') args.push('--source duplex');

  // Page size (NAPS2 handles standard names well)
  args.push(`--pagesize ${pageSize}`);

  const command = `"${NAPS2_PATH}" ${args.join(' ')}`;
  console.log('[scan command]', command);

  exec(command, { timeout: 120000 }, (err, stdout, stderr) => {
    if (stdout.trim()) console.log('[stdout]', stdout.trim());
    if (stderr.trim()) console.error('[stderr]', stderr.trim());

    let actualPath = outputPath;
    let actualFilename = filename;

    // If duplex/multi-page JPG was scanned, NAPS2 might name it filename.1.jpg
    if (!fs.existsSync(actualPath)) {
      const parts = outputPath.split('.');
      const ext = parts.pop();
      const numberedPath = `${parts.join('.')}.1.${ext}`;
      
      if (fs.existsSync(numberedPath)) {
        actualPath = numberedPath;
        actualFilename = `${filename.split(`.${ext}`)[0]}.1.${ext}`;
      }
    }

    if (!fs.existsSync(actualPath)) {
      const msg = (stderr || stdout || err?.message || 'Scan failed').trim();
      return res.status(500).json({ error: msg });
    }

    const fileData = fs.readFileSync(actualPath);
    const contentType = format === 'pdf' ? 'application/pdf' : 'image/jpeg';
    
    res.set('Content-Type', contentType);
    res.set('Content-Disposition', `attachment; filename="${actualFilename}"`);
    res.send(fileData);

    // Cleanup all related files after 30 seconds
    setTimeout(() => {
      try {
        if (fs.existsSync(actualPath)) fs.unlinkSync(actualPath);
        // Also try to clean up the original path if it's different
        if (actualPath !== outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        // Cleanup potential other pages if it was a multi-page scan
        const base = outputPath.split(`.${format}`)[0];
        for (let i = 2; i <= 10; i++) {
          const p = `${base}.${i}.${format}`;
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
      } catch {}
    }, 30000);
  });
});

const server = app.listen(PORT, () => {
  console.log(`\n✅  Scanner Bridge (NAPS2) running`);
  console.log(`    Open → http://localhost:${PORT}\n`);
});

server.on('error', (err) => {
  console.error('❌ SERVER ERROR:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please close the other process or use a different port.`);
  }
});

process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
});

