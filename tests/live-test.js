const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const PORT = 18220;
const BASE = 'http://127.0.0.1:' + PORT;
const ROOT = path.join(__dirname, '..');

function get(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(BASE + urlPath, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(data), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, body: data.substring(0,200), headers: res.headers }); }
      });
    }).on('error', reject);
  });
}

function post(urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: '127.0.0.1', port: PORT, path: urlPath, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = http.request(opts, res => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(chunks) }); }
        catch { resolve({ status: res.statusCode, body: chunks.substring(0,200) }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForServer(maxRetries) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await get('/api/health');
      return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error('Server did not start in time');
}

async function run() {
  // Create a wrapper script that sets PORT via env and requires original server.js
  const wrapperCode = `
process.env.__TEST_PORT = '${PORT}';
const path = require('path');
const Module = require('module');
const fs = require('fs');
const serverPath = path.resolve('${ROOT.replace(/\\/g, '/')}', 'server.js');
let code = fs.readFileSync(serverPath, 'utf8');
code = code.replace(/const PORT = \\d+;/, 'const PORT = ${PORT};');
const m = new Module(serverPath);
m.filename = serverPath;
m.paths = Module._nodeModulePaths(path.dirname(serverPath));
m._compile(code, serverPath);
`;
  const tmpFile = path.join(ROOT, 'tests', '_tmp_wrapper.js');
  fs.writeFileSync(tmpFile, wrapperCode, 'utf8');

  console.log('\n\u2501\u2501\u2501 \uC11C\uBC84 \uC2DC\uC791 (port ' + PORT + ') \u2501\u2501\u2501\n');

  const child = spawn(process.execPath, [tmpFile], {
    cwd: ROOT,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let serverErr = '';
  child.stderr.on('data', d => { serverErr += d.toString(); });

  try {
    await waitForServer(12);
    console.log('  \uC11C\uBC84 \uC900\uBE44 \uC644\uB8CC (PID: ' + child.pid + ')\n');

    let pass = 0, fail = 0;
    function check(name, ok, detail) {
      if (ok) { pass++; console.log('  \u2713 ' + name); }
      else { fail++; console.log('  \u2717 ' + name + (detail ? ' \u2192 ' + detail : '')); }
    }

    console.log('\u2501\u2501\u2501 API \uD14C\uC2A4\uD2B8 \u2501\u2501\u2501\n');

    // 1. Health
    const h = await get('/api/health');
    check('GET /api/health \u2192 200', h.status === 200, 'status=' + h.status);
    check('  status=ok', h.json?.status === 'ok');
    check('  version=3.0.0', h.json?.version === '3.0.0', h.json?.version);
    check('  memory info', !!h.json?.memory);
    check('  files info', typeof h.json?.files?.input === 'number');

    // 2. Version
    const v = await get('/api/version');
    check('GET /api/version \u2192 200', v.status === 200);
    check('  changelog', Array.isArray(v.json?.changelog));

    // 3. Themes
    const t = await get('/api/themes');
    check('GET /api/themes \u2192 200', t.status === 200);
    check('  count > 0', t.json?.themes?.length > 0, 'n=' + t.json?.themes?.length);
    check('  has colors', !!t.json?.themes?.[0]?.colors?.primary);

    // 4. Templates
    const tp = await get('/api/templates');
    check('GET /api/templates \u2192 200', tp.status === 200);
    check('  count > 0', tp.json?.templates?.length > 0, 'n=' + tp.json?.templates?.length);

    // 5-9. Other GETs
    check('GET /api/sources \u2192 200', (await get('/api/sources')).status === 200);
    check('GET /api/files \u2192 200', (await get('/api/files')).status === 200);
    check('GET /api/outputs \u2192 200', (await get('/api/outputs')).status === 200);

    const r = await get('/api/recent');
    check('GET /api/recent \u2192 200', r.status === 200);
    check('  activities array', Array.isArray(r.json?.activities));

    check('GET /api/favorites \u2192 200', (await get('/api/favorites')).status === 200);

    const st = await get('/api/settings');
    check('GET /api/settings \u2192 200', st.status === 200);
    check('  success=true', st.json?.success === true);

    // 10. Search
    const sr = await get('/api/search?query=test');
    check('GET /api/search \u2192 200', sr.status === 200);
    check('  totalResults', typeof sr.json?.totalResults === 'number');
    check('search no query \u2192 400', (await get('/api/search')).status === 400);

    // 11. Stats & Docs
    check('GET /api/stats \u2192 200', (await get('/api/stats')).status === 200);
    const docs = await get('/api/docs');
    check('GET /api/docs \u2192 200', docs.status === 200);
    check('  SSE endpoint listed', docs.json?.endpoints?.some(e => e.path === '/api/events'));

    // 12. 404
    const n404 = await get('/api/nonexistent');
    check('404 API JSON', n404.status === 404 && !!n404.json?.error);
    check('404 Page HTML', (await get('/nonexistent-page')).status === 404);

    // 13. Security headers
    check('X-Content-Type-Options', h.headers['x-content-type-options'] === 'nosniff');
    check('X-Request-Id', !!h.headers['x-request-id']);
    check('X-RateLimit-Limit=60', h.headers['x-ratelimit-limit'] === '60');
    check('X-Frame-Options', h.headers['x-frame-options'] === 'SAMEORIGIN');
    check('CORS allow-origin', h.headers['access-control-allow-origin'] === '*');

    // 14. Static pages
    check('GET / \u2192 200', (await get('/')).status === 200);
    check('GET /editor \u2192 200', (await get('/editor')).status === 200);
    check('GET /templates \u2192 200', (await get('/templates')).status === 200);
    check('GET /presenter \u2192 200', (await get('/presenter')).status === 200);
    check('GET /api-docs \u2192 200', (await get('/api-docs')).status === 200);

    // 15. Generate: text -> web
    const gen = await post('/api/generate/from-text', {
      text: '1. \uC11C\uB860\n\uAD50\uC721\uC758 \uC911\uC694\uC131\n\n2. \uBCF8\uB860\n\uC2E4\uC81C \uC0AC\uB840\n\uBC29\uBC95\uB860\n\n3. \uACB0\uB860\n\uD575\uC2EC \uC815\uB9AC',
      title: '\uD14C\uC2A4\uD2B8',
      outputType: 'web', theme: 'modern', filename: '_test-auto.html'
    });
    check('POST /generate/from-text \u2192 200', gen.status === 200, 'status=' + gen.status);
    check('  success', gen.json?.success === true, JSON.stringify(gen.json?.error));
    check('  slideCount > 0', gen.json?.slideCount > 0, 'n=' + gen.json?.slideCount);
    if (gen.json?.path) {
      check('  file accessible', (await get(gen.json.path)).status === 200);
    }

    // 16. Generate: web-from-data
    const wfd = await post('/api/generate/web-from-data', {
      filename: '_test-data.html',
      slides: { cover: { title: 'Test' }, slides: [{ title: 'S1', type: 'bullets', items: ['A'] }] },
      theme: 'modern'
    });
    check('POST /generate/web-from-data \u2192 200', wfd.status === 200);
    check('  success', wfd.json?.success === true);

    // 17. Generate: pptx
    const pptx = await post('/api/generate/pptx', {
      filename: '_test.pptx',
      slides: {
        cover: { title: 'PPTX Test', subtitle: 'Auto' },
        slides: [{ title: 'S1', type: 'bullets', items: ['A', 'B'] }]
      },
      theme: 'modern'
    });
    check('POST /generate/pptx \u2192 200', pptx.status === 200, 'status=' + pptx.status);
    check('  success', pptx.json?.success === true, JSON.stringify(pptx.json?.error));

    // 18. Preview
    const prev = await post('/api/preview', {
      slides: { cover: { title: 'P' }, slides: [{ title: 'S', type: 'bullets', items: ['x'] }] },
      theme: 'modern'
    });
    check('POST /preview \u2192 200', prev.status === 200);
    check('  html length > 100', prev.json?.html?.length > 100);

    // 19. Export-all
    const exp = await post('/api/export-all', { type: 'all' });
    check('POST /export-all \u2192 200', exp.status === 200);
    check('  totalFiles', typeof exp.json?.totalFiles === 'number');

    // 20. SSE
    const sse = await new Promise((resolve) => {
      const req = http.get(BASE + '/api/events', res => {
        let data = '';
        res.on('data', c => { data += c; });
        setTimeout(() => { req.destroy(); resolve({ status: res.statusCode, data, headers: res.headers }); }, 800);
      });
      req.on('error', () => resolve({ status: 0 }));
    });
    check('GET /api/events (SSE) \u2192 200', sse.status === 200);
    check('  content-type', sse.headers?.['content-type']?.includes('text/event-stream'));
    check('  connected event', sse.data?.includes('event: connected'));

    // Cleanup
    const outWeb = path.join(ROOT, 'output', 'web');
    const outPptx = path.join(ROOT, 'output', 'pptx');
    ['_test-auto.html', '_test-data.html'].forEach(fn => {
      try { fs.unlinkSync(path.join(outWeb, fn)); } catch {}
    });
    try { fs.unlinkSync(path.join(outPptx, '_test.pptx')); } catch {}

    console.log('\n\u2501\u2501\u2501 \uACB0\uACFC: ' + pass + '/' + (pass + fail) + ' \uD1B5\uACFC (' + fail + '\uAC1C \uC2E4\uD328) \u2501\u2501\u2501\n');
    return fail;

  } catch (e) {
    if (serverErr) console.error('Server stderr:', serverErr.substring(0, 500));
    throw e;
  } finally {
    child.kill('SIGTERM');
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

run().then(f => process.exit(f > 0 ? 1 : 0)).catch(e => { console.error('Fatal:', e.message); process.exit(1); });
