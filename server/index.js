import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns/promises';
import net from 'node:net';

const app = express();
const PORT = process.env.PORT || 8787;

app.use(express.json({ limit: '32kb' }));

function isPublicIPv4(ip) {
  if (net.isIP(ip) !== 4) return false;

  const [a, b] = ip.split('.').map(Number);

  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 192 && b === 0) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;

  return true;
}

app.post('/api/xtream', async (req, res) => {
  try {
    const { server, username, password, action, extra = {} } = req.body || {};

    if (
      typeof server !== 'string' ||
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !server || !username || !password ||
      typeof extra !== 'object' || Array.isArray(extra)
    ) {
      return res.status(400).json({ error: 'Datos incompletos o no válidos.' });
    }

    const parsed = new URL(server);

    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.username || parsed.password ||
      parsed.hostname === 'localhost' ||
      net.isIP(parsed.hostname) === 6
    ) {
      return res.status(400).json({ error: 'Dirección del servidor no válida.' });
    }

    const addresses = net.isIP(parsed.hostname)
      ? [{ address: parsed.hostname }]
      : await dns.lookup(parsed.hostname, { all: true });

    if (!addresses.length || addresses.some(
      item => !isPublicIPv4(item.address)
    )) {
      return res.status(400).json({ error: 'Dirección del servidor no permitida.' });
    }

    const url = new URL('/player_api.php', parsed.origin);
    url.searchParams.set('username', username);
    url.searchParams.set('password', password);

    if (typeof action === 'string') {
      url.searchParams.set('action', action);
    }

    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      redirect: 'error',
      headers: { Accept: 'application/json' }
    });

    const body = await response.text();

    res.status(response.status)
      .type(response.headers.get('content-type') || 'application/json')
      .send(body);

  } catch {
    res.status(502).json({ error: 'No se pudo conectar con el servidor IPTV.' });
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '../dist');

app.use(express.static(dist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(dist, 'index.html'));
});

app.listen(PORT, () => console.log('IPTV Player iniciado.'));
