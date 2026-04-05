const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const fs = require('fs');

// We need to start the Express app on a random port for testing.
// Since server.js starts listening on a fixed port, we must import app differently.
// Strategy: require server.js parts by manipulating the module, or spawn a child process.
// Simplest approach: Create a test helper that extracts the app.

let server;
let baseUrl;

function request(method, urlPath, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {}
    };

    if (body !== null) {
      const data = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(options, (res) => {
      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString();
        let json = null;
        try { json = JSON.parse(rawBody); } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: rawBody,
          json
        });
      });
    });

    req.on('error', reject);
    if (body !== null) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

describe('Server API', () => {
  before(async () => {
    // Ensure required directories exist
    const projectRoot = path.join(__dirname, '..');
    ['input', 'output/pptx', 'output/web'].forEach(dir => {
      fs.mkdirSync(path.join(projectRoot, dir), { recursive: true });
    });

    // Start server by requiring the express app
    // We need to intercept the listen call. Instead, we'll spawn it.
    // Alternative: just start our own server on a dynamic port using the express app.

    // Strategy: We'll require server.js but it will start on port 8220.
    // To avoid port conflicts, we'll use a child process approach.
    const { spawn } = require('child_process');

    // Find a free port
    const getPort = () => new Promise((resolve) => {
      const srv = require('net').createServer();
      srv.listen(0, () => {
        const port = srv.address().port;
        srv.close(() => resolve(port));
      });
    });

    const port = await getPort();

    // We need to modify the port. Since server.js uses a hardcoded port,
    // we'll set PORT env var and patch server.js behavior.
    // Actually, server.js hardcodes PORT = 8220. Let's just use that port
    // but check if it's available first, otherwise skip.

    // Better approach: spawn child process with env override
    // But server.js doesn't read from env. So let's just use port 8220.
    // To be safe, let's try to start on 8220 and handle failures.

    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(projectRoot, 'server.js')], {
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: projectRoot
      });

      server = child;
      baseUrl = 'http://localhost:8220';

      let started = false;
      const timeout = setTimeout(() => {
        if (!started) {
          started = true;
          // Maybe server is already running, try connecting
          resolve();
        }
      }, 5000);

      child.stdout.on('data', (data) => {
        const text = data.toString();
        if (text.includes('localhost:8220') && !started) {
          started = true;
          clearTimeout(timeout);
          resolve();
        }
      });

      child.stderr.on('data', (data) => {
        // Port might be in use - try using existing server
        const text = data.toString();
        if (text.includes('EADDRINUSE') && !started) {
          started = true;
          clearTimeout(timeout);
          server = null; // Don't kill the external server
          resolve();
        }
      });

      child.on('error', (err) => {
        if (!started) {
          started = true;
          clearTimeout(timeout);
          reject(err);
        }
      });
    });
  });

  after(() => {
    if (server && server.kill) {
      server.kill('SIGTERM');
    }
  });

  // ── GET /api/health ───────────────────────────────────────

  it('GET /api/health returns status ok', async () => {
    const res = await request('GET', '/api/health');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.json, 'should return JSON');
    assert.strictEqual(res.json.status, 'ok');
    assert.ok(res.json.version, 'should have version');
    assert.ok(typeof res.json.uptime === 'number', 'uptime should be a number');
    assert.ok(res.json.memory, 'should have memory info');
    assert.ok(res.json.files, 'should have files info');
  });

  // ── GET /api/themes ───────────────────────────────────────

  it('GET /api/themes returns themes array', async () => {
    const res = await request('GET', '/api/themes');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.json, 'should return JSON');
    assert.ok(Array.isArray(res.json.themes), 'themes should be an array');
    assert.ok(res.json.themes.length > 0, 'should have at least one theme');

    const theme = res.json.themes[0];
    assert.ok(theme.id, 'theme should have id');
    assert.ok(theme.name, 'theme should have name');
    assert.ok(theme.colors, 'theme should have colors');
  });

  // ── GET /api/templates ────────────────────────────────────

  it('GET /api/templates returns templates array', async () => {
    const res = await request('GET', '/api/templates');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.json, 'should return JSON');
    assert.ok(Array.isArray(res.json.templates), 'templates should be an array');
    assert.ok(res.json.templates.length > 0, 'should have at least one template');

    const tmpl = res.json.templates[0];
    assert.ok(tmpl.type, 'template should have type');
    assert.ok(tmpl.name, 'template should have name');
    assert.ok(tmpl.description, 'template should have description');
    assert.ok(tmpl.example, 'template should have example');
  });

  // ── GET /api/sources ──────────────────────────────────────

  it('GET /api/sources returns sources', async () => {
    const res = await request('GET', '/api/sources');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.json, 'should return JSON');
    assert.ok(Array.isArray(res.json.sources), 'sources should be an array');
  });

  // ── GET /api/settings ─────────────────────────────────────

  it('GET /api/settings returns default settings', async () => {
    const res = await request('GET', '/api/settings');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.json, 'should return JSON');
    assert.strictEqual(res.json.success, true);
    assert.ok(res.json.settings, 'should have settings object');
  });

  // ── POST /api/settings ────────────────────────────────────

  it('POST /api/settings saves and returns settings', async () => {
    const newSettings = { defaultTheme: 'dark', testValue: 42 };
    const res = await request('POST', '/api/settings', newSettings);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.json, 'should return JSON');
    assert.strictEqual(res.json.success, true);
    assert.strictEqual(res.json.settings.defaultTheme, 'dark');
    assert.strictEqual(res.json.settings.testValue, 42);

    // Verify it persisted
    const res2 = await request('GET', '/api/settings');
    assert.strictEqual(res2.json.settings.defaultTheme, 'dark');
    assert.strictEqual(res2.json.settings.testValue, 42);

    // Clean up: restore defaults
    await request('POST', '/api/settings', { defaultTheme: 'modern', testValue: undefined });
  });

  // ── GET /api/version ──────────────────────────────────────

  it('GET /api/version returns version info', async () => {
    const res = await request('GET', '/api/version');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.json, 'should return JSON');
    assert.ok(res.json.version, 'should have version');
    assert.ok(res.json.name, 'should have name');
    assert.ok(res.json.nodeVersion, 'should have nodeVersion');
    assert.ok(Array.isArray(res.json.changelog), 'changelog should be an array');
  });

  // ── GET /api/search ───────────────────────────────────────

  it('GET /api/search?query=test returns results structure', async () => {
    const res = await request('GET', '/api/search?query=test');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.json, 'should return JSON');
    assert.strictEqual(res.json.query, 'test');
    assert.ok(Array.isArray(res.json.files), 'files should be an array');
    assert.ok(Array.isArray(res.json.outputs), 'outputs should be an array');
    assert.ok(typeof res.json.totalResults === 'number', 'totalResults should be a number');
  });

  it('GET /api/search without query returns 400', async () => {
    const res = await request('GET', '/api/search');
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.json, 'should return JSON');
    assert.strictEqual(res.json.success, false);
  });

  // ── 404 for unknown API route ─────────────────────────────

  it('404 for unknown API route returns JSON', async () => {
    const res = await request('GET', '/api/nonexistent-route-xyz');
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.json, 'should return JSON for API routes');
    assert.strictEqual(res.json.success, false);
    assert.ok(res.json.error, 'should have error message');
  });

  // ── 404 for unknown page route ────────────────────────────

  it('404 for unknown page route returns HTML', async () => {
    const res = await request('GET', '/nonexistent-page-xyz');
    assert.strictEqual(res.statusCode, 404);
    // Should return HTML (not JSON) for non-API routes
    assert.ok(
      res.headers['content-type'] && res.headers['content-type'].includes('text/html'),
      `expected HTML content-type, got: ${res.headers['content-type']}`
    );
  });
});
