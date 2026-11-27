const express = require('express');
const path = require('path');
const omdown = require('./omdown');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---- API ----

app.get('/api/platforms', (req, res) => {
  try { res.json({ status: true, result: omdown.listPlatforms() }); }
  catch (e) { res.status(500).json({ status: false, error: e.message }); }
});

app.get('/api/stats', async (_req, res) => {
  try { res.json({ status: true, result: await omdown.getStats() }); }
  catch (e) { res.status(502).json({ status: false, error: e.message }); }
});

app.post('/api/resolve', async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ status: false, error: 'URL wajib diisi' });
  if (!/^https?:\/\//i.test(url)) return res.status(400).json({ status: false, error: 'URL tidak valid' });
  try {
    const data = await omdown.resolveCached(url);
    res.json({ status: true, result: data });
  } catch (e) {
    res.status(502).json({ status: false, error: e.message || 'Gagal resolve' });
  }
});

// Kirim file dari server -> browser. Ada batas waktu total supaya tidak menggantung selamanya.
const DOWNLOAD_TIMEOUT_MS = 170000;

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

app.get('/api/download', async (req, res) => {
  const { url, formatId } = req.query;
  if (!url) return res.status(400).json({ status: false, error: 'URL wajib diisi' });
  if (!/^https?:\/\//i.test(String(url))) return res.status(400).json({ status: false, error: 'URL tidak valid' });
  req.setTimeout(DOWNLOAD_TIMEOUT_MS + 10000);
  res.setTimeout(DOWNLOAD_TIMEOUT_MS + 10000);
  try {
    const { buffer, contentType, filename } = await withTimeout(
      omdown.streamFile(String(url), String(formatId || '')),
      DOWNLOAD_TIMEOUT_MS,
      'Server terlalu lama mengambil file (proxy lambat/mati). Coba lagi.'
    );
    const asciiName = filename.replace(/[^\x20-\x7E]/g, '_');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.end(buffer);
  } catch (e) {
    console.error('[download error]', e.message);
    if (res.headersSent) return res.end();
    res.status(502).json({ status: false, error: e.message || 'Gagal mengunduh' });
  }
});

// Error handler global
app.use((err, _req, res, _next) => {
  console.error('[server error]', err);
  res.status(500).json({ status: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ Unduhin berjalan di http://localhost:${PORT}`);
});
