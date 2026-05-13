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

app.use(cors());
app.use(express.json());

// Serve public folder (index.html lives here)
app.use(express.static(path.join(__dirname, 'public')));

if (!fs.existsSync(SCAN_DIR)) fs.mkdirSync(SCAN_DIR, { recursive: true });

// Helper: write a temp .ps1 file and run it in STA mode, then delete it
function runPS(scriptContent, callback) {
  const tmpFile = path.join(os.tmpdir(), `scanner_${Date.now()}.ps1`);
  fs.writeFileSync(tmpFile, scriptContent, 'utf8');
  exec(
    `powershell -Sta -ExecutionPolicy Bypass -File "${tmpFile}"`,
    { timeout: 90000 },
    (err, stdout, stderr) => {
      try { fs.unlinkSync(tmpFile); } catch {}
      callback(err, stdout, stderr);
    }
  );
}

// ── GET /api/scanners ─────────────────────────────────────────────────────────
app.get('/api/scanners', (req, res) => {
  const script = `
$ErrorActionPreference = 'Stop'
try {
  $dm = New-Object -ComObject WIA.DeviceManager
  $list = @()
  for ($i = 1; $i -le $dm.DeviceInfos.Count; $i++) {
    $d = $dm.DeviceInfos.Item($i)
    $list += $d.Properties("Name").Value
  }
  Write-Output ($list -join "||")
} catch {
  Write-Output "ERROR:$($_.Exception.Message)"
}
`;
  runPS(script, (err, stdout) => {
    const raw = stdout.trim();
    if (err || raw.startsWith('ERROR:')) {
      console.error('[scanners error]', raw || err?.message);
      return res.json({ scanners: [] });
    }
    const scanners = raw ? raw.split('||').filter(s => s.trim()) : [];
    console.log('[scanners found]', scanners);
    res.json({ scanners });
  });
});

// ── GET /api/status ───────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  const script = `
try {
  $dm = New-Object -ComObject WIA.DeviceManager
  Write-Output $dm.DeviceInfos.Count
} catch {
  Write-Output 0
}
`;
  runPS(script, (err, stdout) => {
    const count = parseInt(stdout.trim()) || 0;
    res.json({ status: count > 0 ? 'online' : 'no_device', deviceCount: count });
  });
});

// ── POST /api/scan ────────────────────────────────────────────────────────────
app.post('/api/scan', (req, res) => {
  const {
    deviceName = '',
    dpi = 300,
    colorMode = 'Gray',
    paperSource = 'Feeder',
    pageSize = 'A4'
  } = req.body;

  const filename = `scan_${Date.now()}.jpg`;
  const outputPath = path.join(SCAN_DIR, filename);
  const scriptPath = path.join(__dirname, 'scan.ps1');

  const command = [
    `powershell -Sta -ExecutionPolicy Bypass`,
    `-File "${scriptPath}"`,
    `-DPI ${parseInt(dpi)}`,
    `-ColorMode ${colorMode}`,
    `-PaperSource ${paperSource}`,
    `-PageSize ${pageSize}`,
    `-DeviceName "${deviceName.replace(/"/g, '')}"`,
    `-OutputPath "${outputPath}"`
  ].join(' ');

  console.log('[scan]', command);

  exec(command, { timeout: 90000 }, (err, stdout, stderr) => {
    console.log('[stdout]', stdout.trim());
    if (stderr.trim()) console.log('[stderr]', stderr.trim());

    if (!fs.existsSync(outputPath)) {
      const msg = (stderr || stdout || err?.message || 'Scan produced no file').trim();
      return res.status(500).json({ error: msg });
    }

    const fileData = fs.readFileSync(outputPath);
    res.set('Content-Type', 'image/jpeg');
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(fileData);

    setTimeout(() => {
      try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
    }, 10000);
  });
});

app.listen(PORT, () => {
  console.log(`\n✅  Scanner Bridge running`);
  console.log(`    Open → http://localhost:${PORT}\n`);
});
