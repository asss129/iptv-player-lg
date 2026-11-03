import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const PORT = process.env.PORT || 8787;
app.use(express.json({ limit: '1mb' }));

// Small server-side Xtream API proxy. Never log submitted credentials.
app.post('/api/xtream', async (req, res) => {
  try {
    const { server, username, password, action, extra = {} } = req.body || {};
    if (!server || !username || !password) return res.status(400).json({ error: 'Faltan servidor, usuario o contraseña.' });
    const parsed = new URL(server);
    if (!['http:', 'https:'].includes(parsed.protocol)) return res.status(400).json({ error: 'URL de servidor no válida.' });
    const url = new URL('/player_api.php', parsed.origin);
    url.searchParams.set('username', username);
    url.searchParams.set('password', password);
    if (action) url.searchParams.set('action', action);
    for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    const response = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'Accept': 'application/json' } });
    const body = await response.text();
    res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(body);
  } catch (e) {
    res.status(502).json({ error: `No se pudo conectar con el servidor IPTV: ${e.message}` });
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '../dist');
app.use(express.static(dist));
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
app.listen(PORT, () => console.log(`IPTV Player listo en http://localhost:${PORT}`));