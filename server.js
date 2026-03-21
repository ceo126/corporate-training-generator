const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const webGenerator = require('./lib/webGenerator');
const pptGenerator = require('./lib/pptGenerator');
const fileParser = require('./lib/fileParser');

const app = express();
const PORT = 8220;

// ============================================================
//  상수 정의
// ============================================================

const SUPPORTED_EXT = ['.pdf', '.docx', '.txt', '.md', '.pptx', '.hwp'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_BULK_FILES = 20;
const MAX_PREVIEW_LENGTH = 5000;
const SCAN_CACHE_TTL = 10000; // 10초
const SETTINGS_PATH = path.join(__dirname, 'settings.json');
const MAX_RECENT_ACTIVITIES = 20;

const SERVER_START_TIME = Date.now();
const APP_VERSION = '3.0.0';
const CHANGELOG = [
  { version: '3.0.0', date: '2026-03-20', changes: ['최근 활동 API 추가', '즐겨찾기 기능 추가', '결과물 상세 정보 API', '텍스트→슬라이드 자동 생성', '버전 정보 API', '보안 헤더 강화', '요청 크기 제한 세분화', '정적 파일 캐싱 강화'] },
  { version: '2.1.0', date: '2026-03-15', changes: ['API 문서 엔드포인트', '통합 검색', '사용자 설정'] },
  { version: '2.0.0', date: '2026-03-10', changes: ['웹 발표자료 생성', '일괄 생성', '파일 미리보기'] }
];

// ============================================================
//  유틸리티 함수
// ============================================================

/** 비동기 라우트 핸들러 래퍼 - try/catch 중복 제거 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** 표준 에러 응답 생성 */
function errorResponse(res, status, message, code) {
  return res.status(status).json({ success: false, error: message, code });
}

/** 파일명 검증 */
function validateFileName(name) {
  if (!name || typeof name !== 'string') return '파일명이 필요합니다';
  if (name.includes('/') || name.includes('\\') || name.includes('..')) return '잘못된 파일명입니다';
  const base = path.basename(name);
  if (!base || base.startsWith('.')) return '잘못된 파일명입니다';
  return null; // 유효
}

/** 타입 검증 (pptx | web) */
function validateType(type) {
  if (type !== 'pptx' && type !== 'web') return '잘못된 타입입니다 (pptx 또는 web)';
  return null;
}

/** 소스 디렉토리 검증 */
function validateSourceDir(dir) {
  const resolved = path.resolve(dir);
  if (!sourceDirs.includes(resolved)) return '등록되지 않은 소스 디렉토리입니다';
  return null;
}

/** 업타임 포맷 */
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d > 0) parts.push(d + '일');
  if (h > 0) parts.push(h + '시간');
  if (m > 0) parts.push(m + '분');
  parts.push(s + '초');
  return parts.join(' ');
}

/** 파일 크기 포맷 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

/** 결과물 디렉토리 경로 헬퍼 */
function getOutputDir(type) {
  return path.join(__dirname, type === 'pptx' ? 'output/pptx' : 'output/web');
}

// ============================================================
//  SSE (Server-Sent Events) 실시간 통신
// ============================================================

const sseClients = new Set();

function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// SSE 연결 엔드포인트
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('event: connected\ndata: {}\n\n');
  sseClients.add(res);
  req.on('close', () => { sseClients.delete(res); });
});

// 30초마다 서버 통계 브로드캐스트
setInterval(() => {
  if (sseClients.size === 0) return;
  try {
    const mem = process.memoryUsage();
    let inputFileCount = 0, outputPptxCount = 0, outputWebCount = 0;
    const inputDir = path.join(__dirname, 'input');
    const pptxDir = path.join(__dirname, 'output/pptx');
    const webDir = path.join(__dirname, 'output/web');
    try { inputFileCount = fs.readdirSync(inputDir).filter(f => !f.startsWith('.')).length; } catch {}
    try { outputPptxCount = fs.readdirSync(pptxDir).filter(f => f.endsWith('.pptx')).length; } catch {}
    try { outputWebCount = fs.readdirSync(webDir).filter(f => f.endsWith('.html')).length; } catch {}

    broadcast('server:stats', {
      uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024)
      },
      files: { input: inputFileCount, outputPptx: outputPptxCount, outputWeb: outputWebCount },
      clients: sseClients.size
    });
  } catch (e) {
    // ignore stats errors
  }
}, 30000);

// ============================================================
//  최근 활동 (메모리 저장, 최대 20건)
// ============================================================

const recentActivities = [];

function addActivity(action, detail) {
  recentActivities.unshift({
    action,
    detail,
    timestamp: new Date().toISOString()
  });
  if (recentActivities.length > MAX_RECENT_ACTIVITIES) {
    recentActivities.length = MAX_RECENT_ACTIVITIES;
  }
}

// ============================================================
//  scanDir + 메모리 캐시 (10초 TTL)
// ============================================================

const scanCache = new Map();

function scanDir(baseDir, currentDir, files) {
  let entries;
  try {
    entries = fs.readdirSync(currentDir);
  } catch (err) {
    return; // 권한 없는 폴더 등은 건너뜀
  }
  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
    const fullPath = path.join(currentDir, entry);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (err) {
      continue; // 접근 불가 파일 건너뜀
    }
    if (stat.isDirectory()) {
      scanDir(baseDir, fullPath, files);
    } else {
      const ext = path.extname(entry).toLowerCase();
      if (SUPPORTED_EXT.includes(ext)) {
        files.push({
          name: entry,
          relativePath: path.relative(baseDir, fullPath),
          sourceDir: baseDir,
          size: stat.size,
          type: ext,
          modified: stat.mtime
        });
      }
    }
  }
}

/** 캐시된 scanDir - 동일 디렉토리 스캔을 10초간 캐시 */
function getCachedFiles() {
  const cacheKey = sourceDirs.join('|');
  const cached = scanCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < SCAN_CACHE_TTL) {
    return cached.files;
  }
  const files = [];
  for (const dir of sourceDirs) {
    if (!fs.existsSync(dir)) continue;
    scanDir(dir, dir, files);
  }
  scanCache.set(cacheKey, { files, timestamp: Date.now() });
  return files;
}

/** scanDir 캐시 무효화 */
function invalidateScanCache() {
  scanCache.clear();
}

// ============================================================
//  설정 파일 읽기/쓰기
// ============================================================

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    }
  } catch {}
  return { defaultTheme: 'modern', defaultSlideCount: 10, favorites: [] };
}

function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
}

// ============================================================
//  외부 소스 폴더 설정
// ============================================================

let sourceDirs = [
  path.join(__dirname, 'input'),
  'D:/0000.유벤치/기업교육 자료'
].map(d => path.resolve(d)).filter(d => fs.existsSync(d));

// ============================================================
//  미들웨어
// ============================================================

// --- 인메모리 Rate Limiter (IP당 분당 60회) ---
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1분
const RATE_LIMIT_MAX = 60;

// 1분마다 만료된 항목 정리
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000);

app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    entry = { count: 0, windowStart: now };
    rateLimitMap.set(ip, entry);
  }
  entry.count++;
  res.header('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
  res.header('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT_MAX - entry.count)));
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({
      success: false,
      error: '요청이 너무 많습니다. 1분 후 다시 시도해주세요.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
  next();
});

// --- 요청 ID 부여 (X-Request-Id) ---
app.use((req, res, next) => {
  const requestId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  req.requestId = requestId;
  res.header('X-Request-Id', requestId);
  next();
});

// --- 보안 헤더 ---
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'SAMEORIGIN');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

// --- CORS 헤더 ---
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// --- 요청 로깅 ---
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// --- 요청 크기 제한 세분화 ---
// /api/generate/* 는 50MB, 나머지는 1MB
app.use('/api/generate', express.json({ limit: '50mb' }));
app.use('/api/generate', express.urlencoded({ extended: true, limit: '50mb' }));
app.use((req, res, next) => {
  // generate 경로가 아닌 경우에만 1MB 제한 적용
  if (req.path.startsWith('/api/generate')) return next();
  express.json({ limit: '1mb' })(req, res, (err) => {
    if (err) return errorResponse(res, 413, '요청 크기가 1MB를 초과합니다', 'PAYLOAD_TOO_LARGE');
    express.urlencoded({ extended: true, limit: '1mb' })(req, res, next);
  });
});

// --- Static 파일 (ETag + Cache-Control 활성화) ---
app.use(express.static('public', { etag: true, lastModified: true }));
app.use('/output', express.static('output', {
  etag: true,
  lastModified: true,
  maxAge: '1h',
  setHeaders: (res) => {
    res.set('Cache-Control', 'public, max-age=3600, must-revalidate');
  }
}));

// ============================================================
//  파일 업로드 설정
// ============================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'input/'),
  filename: (req, file, cb) => {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    // Path traversal 방지: 파일명에서 경로 구분자 제거
    const safeName = path.basename(originalName);
    cb(null, safeName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (SUPPORTED_EXT.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`지원하지 않는 파일 형식: ${ext}`));
    }
  }
});

// ============================================================
//  API: 버전 정보
// ============================================================

app.get('/api/version', (req, res) => {
  res.json({
    version: APP_VERSION,
    name: '기업교육 발표자료 생성기',
    nodeVersion: process.version,
    changelog: CHANGELOG
  });
});

// ============================================================
//  API: 최근 활동
// ============================================================

app.get('/api/recent', (req, res) => {
  res.json({ activities: recentActivities });
});

// ============================================================
//  API: 즐겨찾기
// ============================================================

app.get('/api/favorites', (req, res) => {
  try {
    const settings = loadSettings();
    const favorites = settings.favorites || [];
    res.json({ success: true, favorites });
  } catch (err) {
    errorResponse(res, 500, '즐겨찾기 조회 실패: ' + err.message, 'FAVORITES_ERROR');
  }
});

app.post('/api/favorite/:type/:name', (req, res) => {
  const { type, name } = req.params;
  const typeErr = validateType(type);
  if (typeErr) return errorResponse(res, 400, typeErr, 'INVALID_TYPE');

  try {
    const settings = loadSettings();
    if (!settings.favorites) settings.favorites = [];

    const key = `${type}/${name}`;
    const idx = settings.favorites.indexOf(key);
    let added;

    if (idx === -1) {
      settings.favorites.push(key);
      added = true;
    } else {
      settings.favorites.splice(idx, 1);
      added = false;
    }

    saveSettings(settings);
    res.json({ success: true, favorited: added, key, favorites: settings.favorites });
  } catch (err) {
    errorResponse(res, 500, '즐겨찾기 토글 실패: ' + err.message, 'FAVORITE_TOGGLE_ERROR');
  }
});

// ============================================================
//  API: 소스 폴더 관리
// ============================================================

app.get('/api/sources', (req, res) => {
  res.json({ sources: sourceDirs });
});

app.post('/api/source', (req, res) => {
  const { dirPath } = req.body;
  if (!dirPath) return errorResponse(res, 400, '경로를 입력해주세요', 'MISSING_PATH');
  const resolved = path.resolve(dirPath);
  if (!fs.existsSync(resolved)) return errorResponse(res, 404, '폴더를 찾을 수 없습니다: ' + resolved, 'DIR_NOT_FOUND');
  if (!sourceDirs.includes(resolved)) {
    sourceDirs.push(resolved);
    invalidateScanCache();
  }
  res.json({ success: true, sources: sourceDirs });
});

app.delete('/api/source', (req, res) => {
  const { dirPath } = req.body;
  const resolved = path.resolve(dirPath);
  sourceDirs = sourceDirs.filter(d => d !== resolved);
  invalidateScanCache();
  res.json({ success: true, sources: sourceDirs });
});

// ============================================================
//  API: 파일 관리
// ============================================================

app.get('/api/files', (req, res) => {
  try {
    const files = getCachedFiles();
    res.json({ files });
  } catch (err) {
    errorResponse(res, 500, '파일 목록 조회 실패: ' + err.message, 'FILE_LIST_ERROR');
  }
});

app.post('/api/upload', (req, res, next) => {
  upload.array('files')(req, res, (err) => {
    if (err) {
      return errorResponse(res, 400, err.message, 'UPLOAD_ERROR');
    }
    invalidateScanCache();
    addActivity('upload', `${req.files.length}개 파일 업로드`);
    res.json({ success: true, count: req.files.length });
  });
});

app.delete('/api/files/:name', (req, res) => {
  const inputDir = path.join(__dirname, 'input');
  const filePath = path.join(inputDir, req.params.name);
  // Path Traversal 방지
  if (!filePath.startsWith(inputDir + path.sep)) {
    return errorResponse(res, 400, '잘못된 파일 경로입니다', 'INVALID_PATH');
  }
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    invalidateScanCache();
    addActivity('delete', `파일 삭제: ${req.params.name}`);
    res.json({ success: true });
  } else {
    errorResponse(res, 404, '파일을 찾을 수 없습니다', 'FILE_NOT_FOUND');
  }
});

// ============================================================
//  API: 결과물 관리
// ============================================================

app.get('/api/outputs', (req, res) => {
  try {
    const pptxDir = path.join(__dirname, 'output/pptx');
    const webDir = path.join(__dirname, 'output/web');

    const safeReadDir = (dir, ext, type) => {
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir).filter(f => f.endsWith(ext)).map(f => {
        try {
          return { name: f, type, path: `/output/${type === 'web' ? 'web' : 'pptx'}/${encodeURIComponent(f)}`, modified: fs.statSync(path.join(dir, f)).mtime };
        } catch { return null; }
      }).filter(Boolean);
    };

    const all = [...safeReadDir(pptxDir, '.pptx', 'pptx'), ...safeReadDir(webDir, '.html', 'web')]
      .sort((a, b) => new Date(b.modified) - new Date(a.modified));
    res.json({ outputs: all });
  } catch (err) {
    errorResponse(res, 500, '결과물 목록 조회 실패: ' + err.message, 'OUTPUT_LIST_ERROR');
  }
});

app.get('/api/outputs/:type/:name/info', (req, res) => {
  const { type, name } = req.params;
  const typeErr = validateType(type);
  if (typeErr) return errorResponse(res, 400, typeErr, 'INVALID_TYPE');

  const outputDir = getOutputDir(type);
  const filePath = path.join(outputDir, path.basename(name));
  if (!filePath.startsWith(outputDir + path.sep)) {
    return errorResponse(res, 400, '잘못된 경로입니다', 'INVALID_PATH');
  }
  if (!fs.existsSync(filePath)) {
    return errorResponse(res, 404, '파일을 찾을 수 없습니다', 'FILE_NOT_FOUND');
  }

  try {
    const stat = fs.statSync(filePath);
    const settings = loadSettings();
    const favorites = settings.favorites || [];
    const key = `${type}/${name}`;

    res.json({
      success: true,
      name,
      type,
      size: stat.size,
      sizeFormatted: formatSize(stat.size),
      created: stat.birthtime,
      modified: stat.mtime,
      favorited: favorites.includes(key),
      path: `/output/${type}/${encodeURIComponent(name)}`
    });
  } catch (err) {
    errorResponse(res, 500, '파일 정보 조회 실패: ' + err.message, 'FILE_INFO_ERROR');
  }
});

app.delete('/api/outputs/:type/:name', (req, res) => {
  const { type, name } = req.params;
  const typeErr = validateType(type);
  if (typeErr) return errorResponse(res, 400, typeErr, 'INVALID_TYPE');

  const outputDir = getOutputDir(type);
  const filePath = path.join(outputDir, path.basename(name));
  // Path Traversal 방지
  if (!filePath.startsWith(outputDir + path.sep)) {
    return errorResponse(res, 400, '잘못된 경로입니다', 'INVALID_PATH');
  }
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    addActivity('delete', `결과물 삭제: ${type}/${name}`);
    res.json({ success: true });
  } else {
    errorResponse(res, 404, '파일을 찾을 수 없습니다', 'FILE_NOT_FOUND');
  }
});

app.post('/api/outputs/:type/:name/rename', (req, res) => {
  const { type, name } = req.params;
  const { newName } = req.body;
  const typeErr = validateType(type);
  if (typeErr) return errorResponse(res, 400, typeErr, 'INVALID_TYPE');

  const nameErr = validateFileName(newName);
  if (nameErr) return errorResponse(res, 400, nameErr, 'INVALID_FILENAME');

  const outputDir = getOutputDir(type);
  const oldPath = path.join(outputDir, name);
  const newPath = path.join(outputDir, newName);
  // Path Traversal 방지
  if (!oldPath.startsWith(outputDir + path.sep) || !newPath.startsWith(outputDir + path.sep)) {
    return errorResponse(res, 400, '잘못된 경로입니다', 'INVALID_PATH');
  }
  if (!fs.existsSync(oldPath)) {
    return errorResponse(res, 404, '파일을 찾을 수 없습니다', 'FILE_NOT_FOUND');
  }
  if (fs.existsSync(newPath)) {
    return errorResponse(res, 409, '같은 이름의 파일이 이미 존재합니다', 'FILE_EXISTS');
  }
  try {
    fs.renameSync(oldPath, newPath);
    res.json({ success: true, newName });
  } catch(e) {
    errorResponse(res, 500, '이름 변경 실패: ' + e.message, 'RENAME_ERROR');
  }
});

app.post('/api/outputs/:type/:name/duplicate', (req, res) => {
  const { type, name } = req.params;
  const typeErr = validateType(type);
  if (typeErr) return errorResponse(res, 400, typeErr, 'INVALID_TYPE');

  const outputDir = getOutputDir(type);
  const srcPath = path.join(outputDir, path.basename(name));
  if (!srcPath.startsWith(outputDir + path.sep) && srcPath !== outputDir + path.sep + path.basename(name)) {
    return errorResponse(res, 400, '잘못된 경로입니다', 'INVALID_PATH');
  }
  if (!fs.existsSync(srcPath)) {
    return errorResponse(res, 404, '파일을 찾을 수 없습니다', 'FILE_NOT_FOUND');
  }
  try {
    const ext = path.extname(name);
    const base = path.basename(name, ext);
    let copyName = base + '-복사본' + ext;
    let counter = 1;
    while (fs.existsSync(path.join(outputDir, copyName))) {
      counter++;
      copyName = base + '-복사본' + counter + ext;
    }
    fs.copyFileSync(srcPath, path.join(outputDir, copyName));
    res.json({ success: true, newName: copyName });
  } catch(e) {
    errorResponse(res, 500, '복제 실패: ' + e.message, 'DUPLICATE_ERROR');
  }
});

// ============================================================
//  API: 파일 파싱
// ============================================================

app.post('/api/parse', asyncHandler(async (req, res) => {
  const { filePath, sourceDir } = req.body;
  if (!filePath) return errorResponse(res, 400, '파일 경로가 필요합니다', 'MISSING_PATH');

  // sourceDir이 등록된 소스 디렉토리인지 검증
  const resolvedDir = path.resolve(sourceDir || path.join(__dirname, 'input'));
  const dirErr = validateSourceDir(resolvedDir);
  if (dirErr) return errorResponse(res, 403, dirErr, 'INVALID_SOURCE_DIR');

  const fullPath = path.join(resolvedDir, filePath);
  // Path Traversal 방지
  if (!path.resolve(fullPath).startsWith(resolvedDir + path.sep)) {
    return errorResponse(res, 400, '잘못된 파일 경로입니다', 'INVALID_PATH');
  }
  const result = await fileParser.parseFile(fullPath);
  res.json(result);
}));

// ============================================================
//  API: 생성 (웹/PPTX)
// ============================================================

app.get('/editor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/editor.html'));
});

app.get('/templates', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/templates.html'));
});

app.post('/api/generate/web-from-data', asyncHandler(async (req, res) => {
  const { filename, slides, theme } = req.body;
  const safeName = path.basename(filename);
  const nameErr = validateFileName(safeName);
  if (nameErr) return errorResponse(res, 400, nameErr, 'INVALID_FILENAME');

  const html = webGenerator.generateHTML(slides, { theme, title: slides.cover?.title || 'Presentation' });
  const outputDir = path.join(__dirname, 'output/web');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, safeName), html, 'utf8');
  addActivity('create', `웹 발표자료 생성: ${safeName}`);
  res.json({ success: true, path: `/output/web/${safeName}` });
}));

app.post('/api/generate/web', asyncHandler(async (req, res) => {
  const { filename, html } = req.body;
  const safeName = path.basename(filename);
  const nameErr = validateFileName(safeName);
  if (nameErr) return errorResponse(res, 400, nameErr, 'INVALID_FILENAME');

  const outputDir = path.join(__dirname, 'output/web');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, safeName), html, 'utf8');
  addActivity('create', `웹 발표자료 생성: ${safeName}`);
  res.json({ success: true, path: `/output/web/${safeName}` });
}));

app.post('/api/generate/pptx', asyncHandler(async (req, res) => {
  const { filename, slides, theme } = req.body;
  const safeName = path.basename(filename);
  const nameErr = validateFileName(safeName);
  if (nameErr) return errorResponse(res, 400, nameErr, 'INVALID_FILENAME');

  const outputPath = await pptGenerator.generate(slides, theme, safeName);
  addActivity('create', `PPTX 생성: ${safeName}`);
  res.json({ success: true, path: outputPath });
}));

// ============================================================
//  API: 텍스트 → 슬라이드 자동 생성
// ============================================================

app.post('/api/generate/from-text', asyncHandler(async (req, res) => {
  const { text, title, outputType, theme, template, filename } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return errorResponse(res, 400, '텍스트가 필요합니다', 'MISSING_TEXT');
  }

  // ========== 원고 → 슬라이드 변환 엔진 ==========

  /** 제목에서 번호 접두사 제거 */
  function stripNumberPrefix(str) {
    return str
      .replace(/^(?:\d+[.\)]\s*|제\d+[장절편]\s*|Chapter\s+\d+[:\s]*|[①-⑳]\s*|[❶-❿]\s*|[■▶●◆]\s*)/i, '')
      .trim() || str;
  }

  /** 문단을 문장 단위로 분리 */
  function splitSentences(paragraph) {
    return paragraph
      .split(/(?<=[.!?다요음됨함])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 3);
  }

  /** 긴 문장을 슬라이드용 핵심 구절로 압축 */
  function condense(sentence) {
    let s = sentence
      .replace(/\s*입니다\.?$/, '')
      .replace(/\s*합니다\.?$/, '')
      .replace(/\s*있습니다\.?$/, '')
      .replace(/\s*되었습니다\.?$/, '')
      .replace(/\s*됩니다\.?$/, '')
      .replace(/했습니다\.?$/, '')
      .replace(/있으며,?\s*/, ', ')
      .replace(/뿐만 아니라\s*/, '+ ')
      .replace(/특히\s*/, '')
      .replace(/또한\s*/, '')
      .replace(/이제는\s*/, '')
      .replace(/,\s*$/, '');
    // 60자 이상이면 핵심 부분만 추출
    if (s.length > 60) {
      // 콜론이 있으면 뒤쪽만
      const colonIdx = s.indexOf(':');
      if (colonIdx > 0 && colonIdx < 20) return s;
      // 쉼표로 분리된 첫 번째 절만
      const parts = s.split(/[,，]/);
      if (parts[0].length >= 15 && parts[0].length <= 55) return parts[0].trim();
    }
    return s;
  }

  /** 문단에서 제목 자동 추출 (핵심 주제 명사구, 최대 15자) */
  function extractTitle(sentences, fallback) {
    if (!sentences.length) return fallback;
    const first = sentences[0];
    // "~에 대해", "~분야에서", "~위해서는" 앞의 주제어
    const topicMatch = first.match(/^(.{2,18}?)(?:이|가|은|는|에서|에서도|분야|기술|시장|교육|을|를)\s/);
    if (topicMatch) {
      let t = topicMatch[1].trim().replace(/[은는이가을를에의도서]$/, '').trim();
      if (t.length >= 3 && t.length <= 15) return t;
    }
    // "~하기 위해/위해서는" 패턴에서 주제 추출
    const purposeMatch = first.match(/(.{3,15}?)(?:을|를)\s*(?:성공적으로|효과적으로|안전하게|체계적으로)?\s*(?:도입|활용|적용|추진|실행)/);
    if (purposeMatch) return purposeMatch[1].trim().replace(/[은는이가을를]$/, '') + ' 도입 전략';
    // "~위해서는" 앞의 명사 추출
    const forMatch = first.match(/(.{3,15}?)(?:을|를|에)?\s*(?:위해|하려면|하기 위해)/);
    if (forMatch) return forMatch[1].trim().replace(/[은는이가을를에서도]$/, '').trim();
    // 첫 쉼표까지 또는 15자
    const commaIdx = first.indexOf(',');
    if (commaIdx > 4 && commaIdx < 18) return first.substring(0, commaIdx).trim();
    // 첫 공백 구분 2~3단어
    const words = first.split(/\s+/).slice(0, 3);
    let title = words.join(' ');
    if (title.length > 15) title = title.substring(0, 15);
    return title.replace(/[.!?,]$/, '').trim();
  }

  /** 문장에서 숫자/통계 데이터 감지 */
  function hasStatData(sentence) {
    return /\d+[%명건원개만억조달러배위년]/.test(sentence);
  }

  // ========== 텍스트를 섹션으로 분리 ==========

  // 1차: 빈 줄로 분리
  const rawSections = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);

  // 2차: 각 섹션을 줄 단위로 분석 → 이미 구조화된 것과 원고 형태 구분
  const sections = [];
  for (const raw of rawSections) {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

    if (lines.length >= 2) {
      // 이미 줄바꿈으로 구조화된 텍스트 (기존 로직)
      sections.push({ title: lines[0], bodyLines: lines.slice(1), isStructured: true });
    } else {
      // 한 줄짜리 문단 (원고 형태) → 문장으로 분리
      const sentences = splitSentences(lines[0]);
      if (sentences.length <= 1) {
        // 한 문장짜리 → highlight용
        sections.push({ title: condense(lines[0]), bodyLines: [], isStructured: false, singleSentence: true, originalText: lines[0] });
      } else {
        // 여러 문장 → 핵심 포인트 추출
        const points = sentences.map(s => condense(s)).filter(s => s.length >= 5);
        const title = extractTitle(points, '핵심 포인트');
        sections.push({ title, bodyLines: points, isStructured: false, originalText: lines[0] });
      }
    }
  }

  /** 내용 기반 최적 슬라이드 타입 선택 */
  function chooseBestType(bodyLines, sectionIdx, totalSections) {
    const lineCount = bodyLines.length;
    const avgLen = bodyLines.reduce((s, l) => s + l.length, 0) / (lineCount || 1);
    const hasNumbers = bodyLines.some(l => /\d+[%명건원개]/.test(l));
    const isSequential = bodyLines.every(l => /^[\d]+[.\)단계]|→|->/.test(l.trim()));

    // 숫자/통계가 많으면 stats
    if (hasNumbers && lineCount <= 4) return 'stats';
    // 순차적 내용이면 steps
    if (isSequential || lineCount === 3) return 'steps';
    // 항목이 2개면 two-column 비교
    if (lineCount === 2 && avgLen > 15) return 'two-column';
    // 항목이 4개면 cards (2x2 그리드)
    if (lineCount === 4) return 'cards';
    // 긴 텍스트 1줄이면 highlight
    if (lineCount === 1 && avgLen > 20) return 'highlight';
    // 항목이 많으면 bullets
    if (lineCount >= 5) return 'bullets';
    // 짝수 인덱스는 cards, 홀수는 bullets (단조로움 방지)
    return lineCount <= 3 ? 'bullets' : 'cards';
  }

  // 슬라이드 구조 자동 생성
  const slideTitle = title || '발표자료';
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const slides = {
    cover: { title: slideTitle, subtitle: today },
    toc: [],
    content: []
  };

  // 목차 생성 (섹션이 2개 이상일 때)
  const sectionTitles = sections.map(s => stripNumberPrefix(s.title));
  if (sections.length >= 2) {
    slides.toc = sectionTitles;
  }

  /** 카드 파싱: "키워드: 설명" 또는 앞 단어 분리 */
  function parseCardLine(line) {
    const colonIdx = line.indexOf(':');
    const dashIdx = line.indexOf(' - ');
    if (colonIdx > 0 && colonIdx < 20) {
      return { title: line.substring(0, colonIdx).trim(), body: line.substring(colonIdx + 1).trim() };
    } else if (dashIdx > 0 && dashIdx < 25) {
      return { title: line.substring(0, dashIdx).trim(), body: line.substring(dashIdx + 3).trim() };
    }
    const words = line.split(/\s+/);
    const titleWords = words.slice(0, Math.min(3, Math.ceil(words.length / 2)));
    return { title: titleWords.join(' '), body: words.slice(titleWords.length).join(' ') || line };
  }

  /** 슬라이드 타입 풀 (반복 방지) */
  const contentTypePool = ['bullets', 'cards', 'highlight', 'steps', 'two-column', 'stats'];
  let typePoolIdx = 0;
  function nextType() {
    const t = contentTypePool[typePoolIdx % contentTypePool.length];
    typePoolIdx++;
    return t;
  }

  /** 항목들을 간결한 슬라이드 여러 장으로 분할 (슬라이드당 최대 3항목) */
  function splitIntoSlides(sectionTitle, bodyLines) {
    const MAX_PER_SLIDE = 3;
    const results = [];

    if (bodyLines.length <= MAX_PER_SLIDE) {
      // 3개 이하면 분할 없이 하나의 슬라이드
      results.push(buildSlide(sectionTitle, bodyLines, nextType()));
    } else {
      // 4개 이상이면 분할
      for (let j = 0; j < bodyLines.length; j += MAX_PER_SLIDE) {
        const chunk = bodyLines.slice(j, j + MAX_PER_SLIDE);
        const partNum = Math.floor(j / MAX_PER_SLIDE) + 1;
        const totalParts = Math.ceil(bodyLines.length / MAX_PER_SLIDE);
        const slideTitle = totalParts > 1
          ? `${sectionTitle} (${partNum}/${totalParts})`
          : sectionTitle;
        results.push(buildSlide(slideTitle, chunk, nextType()));
      }
    }
    return results;
  }

  /** 타입에 맞는 슬라이드 데이터 생성 */
  function buildSlide(slideTitle, items, slideType) {
    const hasNumbers = items.some(l => /\d+[%명건원개만억조달러배]/.test(l));

    // 숫자가 있으면 stats 우선
    if (hasNumbers && items.length <= 3) slideType = 'stats';

    let slide;
    switch (slideType) {
      case 'bullets':
        slide = { title: slideTitle, type: 'bullets', items };
        break;
      case 'cards':
        slide = {
          title: slideTitle, type: 'cards',
          cards: items.map(l => parseCardLine(l))
        };
        break;
      case 'steps':
        slide = {
          title: slideTitle, type: 'steps',
          steps: items.map((l, j) => ({ title: `STEP ${j + 1}`, desc: stripNumberPrefix(l) }))
        };
        break;
      case 'stats': {
        const stats = items.map(line => {
          // 가장 의미있는 숫자 추출 (단위가 있는 것 우선)
          const numMatch = line.match(/(\d[\d,.]*)\s*([%명건원개만억조달러배위년분초시간])/) || line.match(/(\d[\d,.]*)\s*/);
          if (numMatch) {
            let label = line.replace(numMatch[0], '').replace(/[:\-·]/g, ' ').replace(/\s+/g, ' ').trim();
            // 불필요한 서술어 제거
            label = label.replace(/(?:을|를|이|가|은|는|의|에|까지|으로|에서)\s*$/, '').trim();
            if (!label) label = line.substring(0, 30);
            return { value: parseInt(numMatch[1].replace(/[,.]/g, '')), suffix: numMatch[2] || '', label };
          }
          return { value: 0, suffix: '', label: line };
        });
        slide = { title: slideTitle, type: 'stats', stats };
        break;
      }
      case 'highlight':
        slide = {
          title: slideTitle, type: 'highlight',
          body: items[0] || '', sub: items.slice(1).join(' · ') || ''
        };
        break;
      case 'two-column': {
        const mid = Math.ceil(items.length / 2);
        slide = {
          title: slideTitle, type: 'two-column',
          leftTitle: '핵심', leftItems: items.slice(0, mid),
          rightTitle: '상세', rightItems: items.slice(mid).length > 0 ? items.slice(mid) : ['']
        };
        break;
      }
      default:
        slide = { title: slideTitle, type: 'bullets', items };
    }
    slide.image = 'illust';
    return slide;
  }

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const sectionTitle = stripNumberPrefix(sec.title);
    const bodyLines = sec.bodyLines;
    const description = sec.originalText
      ? sec.originalText.substring(0, 60).replace(/[.!?]$/, '') + '...'
      : (bodyLines.length > 0 ? bodyLines[0] : '');

    // 섹션 구분 슬라이드
    slides.content.push({
      isSection: true,
      sectionNumber: String(i + 1).padStart(2, '0'),
      title: sectionTitle,
      description
    });

    // 단일 문장 → highlight 슬라이드
    if (sec.singleSentence) {
      slides.content.push({
        title: sectionTitle,
        type: 'highlight',
        body: condense(sec.originalText),
        sub: '',
        image: 'illust'
      });
      continue;
    }

    // 숫자가 포함된 문장들은 별도 stats 슬라이드로 분리
    const statLines = bodyLines.filter(l => hasStatData(l));
    const normalLines = bodyLines.filter(l => !hasStatData(l) || statLines.length === bodyLines.length);

    // 일반 내용 슬라이드들
    if (normalLines.length > 0) {
      const contentSlides = splitIntoSlides(sectionTitle, normalLines);
      contentSlides.forEach(s => {
        // 원문 텍스트를 발표자 노트로 추가
        if (sec.originalText) s.notes = sec.originalText;
        slides.content.push(s);
      });
    }

    // 통계 데이터가 있으면 별도 stats 슬라이드
    if (statLines.length > 0 && statLines.length < bodyLines.length) {
      const statsSlide = buildSlide(sectionTitle + ' 핵심 수치', statLines, 'stats');
      if (sec.originalText) statsSlide.notes = sec.originalText;
      slides.content.push(statsSlide);
    }
  }

  // 엔딩 슬라이드 (ending 구조 사용)
  slides.ending = {
    title: '감사합니다',
    subtitle: slideTitle
  };

  const type = outputType || 'web';
  const safeName = path.basename(filename || (slideTitle + (type === 'pptx' ? '.pptx' : '.html')));
  const selectedTheme = theme || 'modern';

  if (type === 'web') {
    const html = webGenerator.generateHTML(slides, { theme: selectedTheme, title: slideTitle, template: template || '' });
    const outputDir = path.join(__dirname, 'output/web');
    fs.mkdirSync(outputDir, { recursive: true });
    const webName = safeName.endsWith('.html') ? safeName : safeName.replace(/\.[^.]+$/, '.html');
    fs.writeFileSync(path.join(outputDir, webName), html, 'utf8');
    addActivity('create', `텍스트→웹 발표자료: ${webName}`);
    res.json({ success: true, path: `/output/web/${encodeURIComponent(webName)}`, slides, slideCount: slides.content.length });
  } else {
    const pptxName = safeName.endsWith('.pptx') ? safeName : safeName.replace(/\.[^.]+$/, '.pptx');
    const outputPath = await pptGenerator.generate(slides, selectedTheme, pptxName);
    addActivity('create', `텍스트→PPTX: ${pptxName}`);
    res.json({ success: true, path: outputPath, slides, slideCount: slides.content.length });
  }
}));

// ============================================================
//  API: 서버 상태 확인
// ============================================================

app.get('/api/health', (req, res) => {
  try {
    const mem = process.memoryUsage();
    let inputFileCount = 0;
    let outputPptxCount = 0;
    let outputWebCount = 0;

    const inputDir = path.join(__dirname, 'input');
    const pptxDir = path.join(__dirname, 'output/pptx');
    const webDir = path.join(__dirname, 'output/web');

    try { inputFileCount = fs.readdirSync(inputDir).filter(f => !f.startsWith('.')).length; } catch {}
    try { outputPptxCount = fs.readdirSync(pptxDir).filter(f => f.endsWith('.pptx')).length; } catch {}
    try { outputWebCount = fs.readdirSync(webDir).filter(f => f.endsWith('.html')).length; } catch {}

    res.json({
      status: 'ok',
      version: APP_VERSION,
      uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
      uptimeFormatted: formatUptime(Math.floor((Date.now() - SERVER_START_TIME) / 1000)),
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB'
      },
      files: {
        input: inputFileCount,
        outputPptx: outputPptxCount,
        outputWeb: outputWebCount,
        totalOutput: outputPptxCount + outputWebCount
      },
      sourceDirs: sourceDirs.length,
      nodeVersion: process.version
    });
  } catch (err) {
    errorResponse(res, 500, '상태 확인 실패: ' + err.message, 'HEALTH_ERROR');
  }
});

// ============================================================
//  API: 템플릿 목록 (캐시: max-age=3600)
// ============================================================

app.get('/api/templates', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  const templates = [
    {
      type: 'bullets',
      name: '글머리 기호',
      description: '핵심 포인트를 목록으로 정리',
      example: { title: '주요 목표', type: 'bullets', items: ['첫 번째 핵심 포인트', '두 번째 핵심 포인트', '세 번째 핵심 포인트'] }
    },
    {
      type: 'cards',
      name: '카드 레이아웃',
      description: '정보를 카드 형태로 나열',
      example: { title: '핵심 가치', type: 'cards', cards: [{ title: '카드 1', body: '카드 내용 설명' }, { title: '카드 2', body: '카드 내용 설명' }, { title: '카드 3', body: '카드 내용 설명' }] }
    },
    {
      type: 'steps',
      name: '단계별 프로세스',
      description: '순차적인 단계를 시각적으로 표현',
      example: { title: '진행 단계', type: 'steps', steps: [{ title: '1단계: 준비', desc: '사전 준비 사항 확인' }, { title: '2단계: 실행', desc: '계획에 따라 실행' }, { title: '3단계: 검토', desc: '결과 확인 및 피드백' }] }
    },
    {
      type: 'stats',
      name: '통계/숫자 강조',
      description: '주요 수치를 크게 표시',
      example: { title: '성과 지표', type: 'stats', stats: [{ value: 95, suffix: '%', label: '고객 만족도' }, { value: 120, suffix: '명', label: '교육 이수자' }, { value: 30, suffix: '%', label: '생산성 향상' }] }
    },
    {
      type: 'two-column',
      name: '2단 비교',
      description: '두 가지를 좌우로 비교',
      example: { title: '비교 분석', type: 'two-column', leftTitle: 'Before', leftItems: ['기존 방식 1', '기존 방식 2'], rightTitle: 'After', rightItems: ['개선 방식 1', '개선 방식 2'] }
    },
    {
      type: 'timeline',
      name: '타임라인',
      description: '시간순 이벤트 표시',
      example: { title: '연혁', type: 'timeline', events: [{ year: '2020', desc: '설립' }, { year: '2022', desc: '성장' }, { year: '2024', desc: '도약' }] }
    },
    {
      type: 'checklist',
      name: '체크리스트',
      description: '완료/미완료 항목 표시',
      example: { title: '점검 사항', type: 'checklist', items: [{ text: '완료 항목', done: true }, { text: '미완료 항목', done: false }] }
    },
    {
      type: 'quote',
      name: '인용구',
      description: '명언이나 핵심 메시지 강조',
      example: { title: '명언', type: 'quote', quote: '배움에는 왕도가 없다', author: '유클리드' }
    },
    {
      type: 'progress',
      name: '프로그레스 바',
      description: '진행률을 바 형태로 표시',
      example: { title: '진행 현황', type: 'progress', items: [{ label: '프로젝트 A', value: 85 }, { label: '프로젝트 B', value: 60 }] }
    },
    {
      type: 'pyramid',
      name: '피라미드',
      description: '계층 구조를 피라미드로 표현',
      example: { title: '조직 구조', type: 'pyramid', levels: [{ title: '전략', desc: '최상위 목표' }, { title: '전술', desc: '실행 방안' }, { title: '운영', desc: '일상 업무' }] }
    },
    {
      type: 'icon-grid',
      name: '아이콘 그리드',
      description: '아이콘과 함께 항목 나열',
      example: { title: '서비스 소개', type: 'icon-grid', items: [{ title: '서비스 A', desc: '설명' }, { title: '서비스 B', desc: '설명' }, { title: '서비스 C', desc: '설명' }] }
    },
    {
      type: 'donut',
      name: '도넛 차트',
      description: '비율을 도넛 그래프로 표시',
      example: { title: '비율 분석', type: 'donut', items: [{ value: 75, suffix: '%', label: '달성률' }, { value: 90, suffix: '%', label: '참여율' }] }
    },
    {
      type: 'matrix',
      name: '2x2 매트릭스',
      description: '4개 영역으로 분류',
      example: { title: '분석 매트릭스', type: 'matrix', cells: [{ title: '영역 1', body: '설명' }, { title: '영역 2', body: '설명' }, { title: '영역 3', body: '설명' }, { title: '영역 4', body: '설명' }] }
    },
    {
      type: 'cycle',
      name: '순환 다이어그램',
      description: '반복 프로세스를 원형으로 표현',
      example: { title: 'PDCA 사이클', type: 'cycle', nodes: [{ title: 'Plan' }, { title: 'Do' }, { title: 'Check' }, { title: 'Act' }] }
    },
    {
      type: 'process-arrow',
      name: '프로세스 화살표',
      description: '단계별 쉐브론 형태',
      example: { title: '업무 프로세스', type: 'process-arrow', steps: [{ title: '입력', desc: '데이터 수집' }, { title: '처리', desc: '분석' }, { title: '출력', desc: '보고서' }] }
    },
    {
      type: 'bar-chart',
      name: '막대 차트',
      description: '수치를 막대 그래프로 비교',
      example: { title: '매출 비교', type: 'bar-chart', items: [{ label: '1분기', value: 80 }, { label: '2분기', value: 120 }, { label: '3분기', value: 95 }] }
    },
    {
      type: 'highlight',
      name: '강조 슬라이드',
      description: '핵심 메시지를 크게 강조',
      example: { title: '핵심 메시지', type: 'highlight', body: '변화가 곧 기회입니다', sub: '2024년 핵심 전략' }
    },
    {
      type: 'swot',
      name: 'SWOT 분석',
      description: '강점/약점/기회/위협 분석',
      example: { title: 'SWOT 분석', type: 'swot', strengths: ['강점 1'], weaknesses: ['약점 1'], opportunities: ['기회 1'], threats: ['위협 1'] }
    },
    {
      type: 'roadmap',
      name: '로드맵',
      description: '단계별 계획을 타임라인으로 표시',
      example: { title: '로드맵', type: 'roadmap', phases: [{ title: 'Phase 1', desc: '준비 단계', label: 'Q1' }, { title: 'Phase 2', desc: '실행 단계', label: 'Q2' }] }
    }
  ];
  res.json({ templates });
});

// ============================================================
//  API: 디자인 템플릿 목록
// ============================================================

app.get('/api/design-templates', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json({
    templates: [
      { id: '', name: '기본', description: '클린한 기본 스타일 (그라데이션 악센트, 둥근 카드)', preview: 'default' },
      { id: 'glass', name: '글래스모피즘', description: '반투명 유리 효과 + 블러 배경 (모던 트렌드)', preview: 'glass' },
      { id: 'editorial', name: '에디토리얼', description: '매거진/잡지 스타일 (이탤릭 제목, 넓은 여백, 깔끔한 선)', preview: 'editorial' },
      { id: 'geometric', name: '기하학', description: '직선과 각진 도형 (컷 코너 카드, 삼각 패턴)', preview: 'geometric' },
      { id: 'neon', name: '네온 글로우', description: '빛나는 테두리와 그림자 (사이버펑크 느낌)', preview: 'neon' }
    ]
  });
});

// ============================================================
//  API: 테마 목록 (캐시: max-age=3600)
// ============================================================

app.get('/api/themes', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  const { THEMES } = pptGenerator;
  const themes = Object.entries(THEMES).map(([key, t]) => ({
    id: key,
    name: t.name,
    colors: {
      primary: '#' + t.primary,
      secondary: '#' + t.secondary,
      accent: '#' + t.accent,
      bg: '#' + t.bg,
      text: '#' + t.text,
      gradient: t.gradient.map(c => '#' + c)
    }
  }));
  res.json({ themes });
});

// ============================================================
//  API: 웹 미리보기 HTML 생성
// ============================================================

app.post('/api/preview', asyncHandler(async (req, res) => {
  const { slides, theme } = req.body;
  if (!slides) {
    return errorResponse(res, 400, '슬라이드 데이터가 필요합니다', 'MISSING_SLIDES');
  }
  const html = webGenerator.generateHTML(slides, { theme: theme || 'modern', title: slides.cover?.title || 'Preview' });
  res.json({ success: true, html });
}));

// ============================================================
//  API: 파일 내용 미리보기
// ============================================================

app.get('/api/files/:sourceDir/:filePath/preview', asyncHandler(async (req, res) => {
  const { sourceDir, filePath } = req.params;

  // sourceDir은 base64로 인코딩되어 전달됨
  let decodedDir;
  try {
    decodedDir = Buffer.from(sourceDir, 'base64').toString('utf8');
  } catch {
    return errorResponse(res, 400, '잘못된 소스 디렉토리 인코딩입니다', 'INVALID_ENCODING');
  }

  const resolvedDir = path.resolve(decodedDir);
  const dirErr = validateSourceDir(resolvedDir);
  if (dirErr) return errorResponse(res, 403, dirErr, 'INVALID_SOURCE_DIR');

  let decodedPath;
  try {
    decodedPath = Buffer.from(filePath, 'base64').toString('utf8');
  } catch {
    return errorResponse(res, 400, '잘못된 파일 경로 인코딩입니다', 'INVALID_ENCODING');
  }

  const fullPath = path.join(resolvedDir, decodedPath);

  // Path traversal 방지
  if (!path.resolve(fullPath).startsWith(resolvedDir + path.sep) && path.resolve(fullPath) !== resolvedDir) {
    return errorResponse(res, 400, '잘못된 파일 경로입니다', 'INVALID_PATH');
  }

  if (!fs.existsSync(fullPath)) {
    return errorResponse(res, 404, '파일을 찾을 수 없습니다', 'FILE_NOT_FOUND');
  }

  const result = await fileParser.parseFile(fullPath);
  const preview = result.text ? result.text.substring(0, MAX_PREVIEW_LENGTH) : '';
  const truncated = result.text && result.text.length > MAX_PREVIEW_LENGTH;

  res.json({
    name: result.name,
    type: result.type,
    preview,
    truncated,
    fullLength: result.text ? result.text.length : 0,
    pages: result.pages || null,
    error: result.error || null
  });
}));

// ============================================================
//  API: 일괄 생성 (Bulk)
// ============================================================

app.post('/api/generate/bulk', asyncHandler(async (req, res) => {
  const { files, outputType, theme } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return errorResponse(res, 400, '파일 목록이 필요합니다', 'MISSING_FILES');
  }
  if (!outputType || !['web', 'pptx'].includes(outputType)) {
    return errorResponse(res, 400, 'outputType은 web 또는 pptx여야 합니다', 'INVALID_OUTPUT_TYPE');
  }
  if (files.length > MAX_BULK_FILES) {
    return errorResponse(res, 400, `한 번에 최대 ${MAX_BULK_FILES}개 파일까지 처리 가능합니다`, 'TOO_MANY_FILES');
  }

  const results = [];

  for (const file of files) {
    const { filePath, sourceDir, slides, filename } = file;
    const entry = { originalFile: filePath || filename, status: 'pending' };

    try {
      // slides가 직접 제공된 경우 (이미 파싱+구조화된 데이터)
      if (slides) {
        const safeName = path.basename(filename || 'presentation');

        if (outputType === 'web') {
          const html = webGenerator.generateHTML(slides, { theme: theme || 'modern', title: slides.cover?.title || 'Presentation' });
          const outputDir = path.join(__dirname, 'output/web');
          fs.mkdirSync(outputDir, { recursive: true });
          const webName = safeName.endsWith('.html') ? safeName : safeName.replace(/\.[^.]+$/, '.html');
          fs.writeFileSync(path.join(outputDir, webName), html, 'utf8');
          entry.status = 'success';
          entry.outputPath = `/output/web/${encodeURIComponent(webName)}`;
        } else {
          const pptxName = safeName.endsWith('.pptx') ? safeName : safeName.replace(/\.[^.]+$/, '.pptx');
          const outputPath = await pptGenerator.generate(slides, theme || 'modern', pptxName);
          entry.status = 'success';
          entry.outputPath = outputPath;
        }
      }
      // filePath가 제공된 경우 (파싱만 수행 후 결과 반환)
      else if (filePath && sourceDir) {
        const resolvedDir = path.resolve(sourceDir);
        if (!sourceDirs.includes(resolvedDir)) {
          entry.status = 'error';
          entry.error = '등록되지 않은 소스 디렉토리';
          results.push(entry);
          continue;
        }

        const fullPath = path.join(resolvedDir, filePath);
        if (!path.resolve(fullPath).startsWith(resolvedDir + path.sep)) {
          entry.status = 'error';
          entry.error = '잘못된 파일 경로';
          results.push(entry);
          continue;
        }

        const parsed = await fileParser.parseFile(fullPath);
        entry.status = 'parsed';
        entry.parsed = { name: parsed.name, type: parsed.type, textLength: parsed.text ? parsed.text.length : 0 };
        entry.note = '슬라이드 데이터(slides)를 함께 전달해야 최종 생성이 가능합니다';
      } else {
        entry.status = 'error';
        entry.error = 'slides 또는 filePath+sourceDir 조합이 필요합니다';
      }
    } catch (err) {
      entry.status = 'error';
      entry.error = err.message;
    }

    results.push(entry);
  }

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  if (successCount > 0) {
    addActivity('create', `일괄 생성 완료: ${successCount}/${files.length}건 (${outputType})`);
  }

  res.json({
    success: true,
    total: files.length,
    successCount,
    errorCount,
    results
  });
}));

// ============================================================
//  API: 검색 (파일 + 결과물 통합)
// ============================================================

app.get('/api/search', (req, res) => {
  try {
    const query = (req.query.query || req.query.q || '').trim().toLowerCase();
    if (!query) {
      return errorResponse(res, 400, '검색어(query)가 필요합니다', 'MISSING_QUERY');
    }

    // 소스 파일 검색
    const allFiles = getCachedFiles();
    const matchedFiles = allFiles.filter(f => f.name.toLowerCase().includes(query));

    // 결과물 검색
    const pptxDir = path.join(__dirname, 'output/pptx');
    const webDir = path.join(__dirname, 'output/web');
    const matchedOutputs = [];

    const searchOutputDir = (dir, ext, type) => {
      if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir).filter(f => f.endsWith(ext) && f.toLowerCase().includes(query)).forEach(f => {
        try {
          const stat = fs.statSync(path.join(dir, f));
          matchedOutputs.push({
            name: f, type,
            path: `/output/${type}/${encodeURIComponent(f)}`,
            size: stat.size,
            modified: stat.mtime
          });
        } catch {}
      });
    };

    searchOutputDir(pptxDir, '.pptx', 'pptx');
    searchOutputDir(webDir, '.html', 'web');

    res.json({
      query,
      files: matchedFiles,
      outputs: matchedOutputs,
      totalResults: matchedFiles.length + matchedOutputs.length
    });
  } catch (err) {
    errorResponse(res, 500, '검색 실패: ' + err.message, 'SEARCH_ERROR');
  }
});

// ============================================================
//  API: 사용자 설정
// ============================================================

app.get('/api/settings', (req, res) => {
  try {
    const settings = loadSettings();
    res.json({ success: true, settings });
  } catch (err) {
    errorResponse(res, 500, '설정 로드 실패: ' + err.message, 'SETTINGS_LOAD_ERROR');
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const current = loadSettings();
    const BLOCKED_KEYS = ['__proto__', 'constructor', 'prototype'];
    const safe = {};
    for (const [k, v] of Object.entries(req.body)) {
      if (!BLOCKED_KEYS.includes(k)) safe[k] = v;
    }
    const updated = { ...current, ...safe };
    saveSettings(updated);
    res.json({ success: true, settings: updated });
  } catch (err) {
    errorResponse(res, 500, '설정 저장 실패: ' + err.message, 'SETTINGS_SAVE_ERROR');
  }
});

// ============================================================
//  페이지 라우트
// ============================================================

app.get('/presenter', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/presenter.html'));
});

app.get('/api-docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/api-docs.html'));
});

// ============================================================
//  API: API 문서
// ============================================================

app.get('/api/docs', (req, res) => {
  const docs = [
    {
      method: 'GET', path: '/api/health',
      description: '서버 상태 확인 (업타임, 메모리, 파일 수)',
      requestBody: null,
      response: '{ status, version, uptime, uptimeFormatted, memory, files, sourceDirs, nodeVersion }'
    },
    {
      method: 'GET', path: '/api/version',
      description: '버전 정보 + 변경 로그',
      requestBody: null,
      response: '{ version, name, nodeVersion, changelog }'
    },
    {
      method: 'GET', path: '/api/recent',
      description: '최근 활동 목록 (최대 20건)',
      requestBody: null,
      response: '{ activities: [{ action, detail, timestamp }] }'
    },
    {
      method: 'GET', path: '/api/favorites',
      description: '즐겨찾기 목록 조회',
      requestBody: null,
      response: '{ success: true, favorites: string[] }'
    },
    {
      method: 'POST', path: '/api/favorite/:type/:name',
      description: '결과물 즐겨찾기 토글',
      requestBody: null,
      response: '{ success: true, favorited: boolean, key, favorites }'
    },
    {
      method: 'GET', path: '/api/sources',
      description: '등록된 소스 디렉토리 목록 조회',
      requestBody: null,
      response: '{ sources: string[] }'
    },
    {
      method: 'POST', path: '/api/source',
      description: '소스 디렉토리 추가',
      requestBody: '{ dirPath: string }',
      response: '{ success: true, sources: string[] }'
    },
    {
      method: 'DELETE', path: '/api/source',
      description: '소스 디렉토리 제거',
      requestBody: '{ dirPath: string }',
      response: '{ success: true, sources: string[] }'
    },
    {
      method: 'GET', path: '/api/files',
      description: '소스 디렉토리 내 지원 파일 목록 조회',
      requestBody: null,
      response: '{ files: [{ name, relativePath, sourceDir, size, type, modified }] }'
    },
    {
      method: 'POST', path: '/api/upload',
      description: '파일 업로드 (multipart/form-data, field: files)',
      requestBody: 'multipart/form-data - files[]',
      response: '{ success: true, count: number }'
    },
    {
      method: 'DELETE', path: '/api/files/:name',
      description: 'input 폴더 내 파일 삭제',
      requestBody: null,
      response: '{ success: true }'
    },
    {
      method: 'GET', path: '/api/outputs',
      description: '생성된 결과물 목록 조회 (pptx + web)',
      requestBody: null,
      response: '{ outputs: [{ name, type, path, modified }] }'
    },
    {
      method: 'GET', path: '/api/outputs/:type/:name/info',
      description: '결과물 상세 정보 (크기, 생성일, 수정일)',
      requestBody: null,
      response: '{ success, name, type, size, sizeFormatted, created, modified, favorited, path }'
    },
    {
      method: 'DELETE', path: '/api/outputs/:type/:name',
      description: '결과물 삭제 (type: pptx | web)',
      requestBody: null,
      response: '{ success: true }'
    },
    {
      method: 'POST', path: '/api/outputs/:type/:name/rename',
      description: '결과물 이름 변경',
      requestBody: '{ newName: string }',
      response: '{ success: true, newName: string }'
    },
    {
      method: 'POST', path: '/api/parse',
      description: '파일 파싱 (텍스트 추출)',
      requestBody: '{ filePath: string, sourceDir?: string }',
      response: '{ name, type, text, pages? }'
    },
    {
      method: 'POST', path: '/api/generate/web',
      description: 'HTML 직접 저장으로 웹 발표자료 생성',
      requestBody: '{ filename: string, html: string }',
      response: '{ success: true, path: string }'
    },
    {
      method: 'POST', path: '/api/generate/web-from-data',
      description: '슬라이드 데이터로 웹 발표자료 생성',
      requestBody: '{ filename: string, slides: object, theme?: string }',
      response: '{ success: true, path: string }'
    },
    {
      method: 'POST', path: '/api/generate/pptx',
      description: 'PPTX 발표자료 생성',
      requestBody: '{ filename: string, slides: object, theme?: string }',
      response: '{ success: true, path: string }'
    },
    {
      method: 'POST', path: '/api/generate/from-text',
      description: '텍스트 → 슬라이드 자동 생성 (섹션 분리 → 다양한 레이아웃 매핑)',
      requestBody: '{ text: string, title?: string, outputType?: "web"|"pptx", theme?: string, filename?: string }',
      response: '{ success: true, path: string, slides: object, slideCount: number }'
    },
    {
      method: 'POST', path: '/api/generate/bulk',
      description: '일괄 발표자료 생성 (최대 20개)',
      requestBody: '{ files: [{ slides, filename, filePath?, sourceDir? }], outputType: "web"|"pptx", theme?: string }',
      response: '{ success, total, successCount, errorCount, results }'
    },
    {
      method: 'POST', path: '/api/preview',
      description: '슬라이드 웹 미리보기 HTML 생성',
      requestBody: '{ slides: object, theme?: string }',
      response: '{ success: true, html: string }'
    },
    {
      method: 'POST', path: '/api/outputs/:type/:name/duplicate',
      description: '결과물 복제',
      requestBody: null,
      response: '{ success: true, newName: string, path: string }'
    },
    {
      method: 'GET', path: '/api/files/:sourceDir/:filePath/preview',
      description: '파일 내용 미리보기 (sourceDir, filePath는 base64 인코딩)',
      requestBody: null,
      response: '{ name, type, preview, truncated, fullLength, pages?, error? }'
    },
    {
      method: 'GET', path: '/api/templates',
      description: '슬라이드 템플릿 목록 조회',
      requestBody: null,
      response: '{ templates: [{ type, name, description, example }] }'
    },
    {
      method: 'GET', path: '/api/themes',
      description: '사용 가능한 테마 목록 조회',
      requestBody: null,
      response: '{ themes: [{ id, name, colors }] }'
    },
    {
      method: 'GET', path: '/api/search',
      description: '파일 + 결과물 통합 검색',
      requestBody: null,
      response: '{ query, files, outputs, totalResults }'
    },
    {
      method: 'GET', path: '/api/settings',
      description: '사용자 설정 조회',
      requestBody: null,
      response: '{ success: true, settings: object }'
    },
    {
      method: 'POST', path: '/api/settings',
      description: '사용자 설정 저장 (병합)',
      requestBody: '{ defaultTheme?: string, defaultSlideCount?: number, ... }',
      response: '{ success: true, settings: object }'
    },
    {
      method: 'GET', path: '/api/docs',
      description: 'API 문서 (이 엔드포인트)',
      requestBody: null,
      response: '이 응답 자체'
    },
    {
      method: 'GET', path: '/api/stats',
      description: '상세 통계 조회',
      requestBody: null,
      response: '{ pptxCount, webCount, totalCount, lastGenerated, largestFile, totalInputSize, sourceBreakdown }'
    },
    {
      method: 'POST', path: '/api/export-all',
      description: '모든 결과물 다운로드 링크 목록 반환',
      requestBody: '{ type?: "all"|"pptx"|"web" }',
      response: '{ totalFiles, totalSize, files: [{ name, type, path, size }] }'
    },
    {
      method: 'GET', path: '/api/events',
      description: 'SSE (Server-Sent Events) 실시간 이벤트 스트림 (서버 통계, 생성 알림)',
      requestBody: null,
      response: 'text/event-stream - event: server:stats, connected'
    }
  ];
  res.json({ version: APP_VERSION, totalEndpoints: docs.length, endpoints: docs });
});

// ============================================================
//  API: 상세 통계
// ============================================================

app.get('/api/stats', (req, res) => {
  try {
    const pptxDir = path.join(__dirname, 'output/pptx');
    const webDir = path.join(__dirname, 'output/web');

    const getFileInfos = (dir, ext, type) => {
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir)
        .filter(f => f.endsWith(ext))
        .map(f => {
          try {
            const stat = fs.statSync(path.join(dir, f));
            return { name: f, type, size: stat.size, modified: stat.mtime };
          } catch { return null; }
        })
        .filter(Boolean);
    };

    const pptxFiles = getFileInfos(pptxDir, '.pptx', 'pptx');
    const webFiles = getFileInfos(webDir, '.html', 'web');
    const allOutputs = [...pptxFiles, ...webFiles];

    let lastGenerated = null;
    if (allOutputs.length > 0) {
      const sorted = allOutputs.sort((a, b) => new Date(b.modified) - new Date(a.modified));
      lastGenerated = { name: sorted[0].name, type: sorted[0].type, modified: sorted[0].modified };
    }

    let largestFile = null;
    if (allOutputs.length > 0) {
      const sorted = [...allOutputs].sort((a, b) => b.size - a.size);
      largestFile = { name: sorted[0].name, type: sorted[0].type, size: sorted[0].size, sizeFormatted: formatSize(sorted[0].size) };
    }

    let totalInputSize = 0;
    const sourceBreakdown = {};
    for (const dir of sourceDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = [];
      scanDir(dir, dir, files);
      sourceBreakdown[dir] = files.length;
      totalInputSize += files.reduce((sum, f) => sum + f.size, 0);
    }

    res.json({
      pptxCount: pptxFiles.length,
      webCount: webFiles.length,
      totalCount: allOutputs.length,
      lastGenerated,
      largestFile,
      totalInputSize,
      totalInputSizeFormatted: formatSize(totalInputSize),
      sourceBreakdown
    });
  } catch (err) {
    errorResponse(res, 500, '통계 조회 실패: ' + err.message, 'STATS_ERROR');
  }
});

// ============================================================
//  API: 결과물 목록 + 다운로드 링크
// ============================================================

app.post('/api/export-all', (req, res) => {
  try {
    const filterType = (req.body && req.body.type) || 'all';
    const pptxDir = path.join(__dirname, 'output/pptx');
    const webDir = path.join(__dirname, 'output/web');

    const collectFiles = (dir, ext, type) => {
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir)
        .filter(f => f.endsWith(ext))
        .map(f => {
          try {
            const stat = fs.statSync(path.join(dir, f));
            return {
              name: f,
              type,
              path: `/output/${type}/${encodeURIComponent(f)}`,
              size: stat.size,
              sizeFormatted: formatSize(stat.size),
              modified: stat.mtime
            };
          } catch { return null; }
        })
        .filter(Boolean);
    };

    let files = [];
    if (filterType === 'all' || filterType === 'pptx') {
      files = files.concat(collectFiles(pptxDir, '.pptx', 'pptx'));
    }
    if (filterType === 'all' || filterType === 'web') {
      files = files.concat(collectFiles(webDir, '.html', 'web'));
    }

    files.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    res.json({
      totalFiles: files.length,
      totalSize,
      totalSizeFormatted: formatSize(totalSize),
      files
    });
  } catch (err) {
    errorResponse(res, 500, '내보내기 목록 조회 실패: ' + err.message, 'EXPORT_ERROR');
  }
});

// ============================================================
//  404 Catch-All
// ============================================================

app.use((req, res) => {
  if (req.path.startsWith('/api/') || req.headers.accept === 'application/json') {
    return res.status(404).json({
      success: false,
      error: '존재하지 않는 API 엔드포인트입니다: ' + req.method + ' ' + req.path,
      code: 'NOT_FOUND',
      path: req.originalUrl
    });
  }
  res.status(404).sendFile(path.join(__dirname, 'public/404.html'));
});

// ============================================================
//  글로벌 에러 핸들러 (표준화된 에러 응답)
// ============================================================

app.use((err, req, res, _next) => {
  console.error('[서버 에러]', err.message);
  res.status(500).json({ success: false, error: '서버 내부 오류가 발생했습니다', code: 'INTERNAL_ERROR' });
});

// ============================================================
//  서버 시작 + Graceful Shutdown
// ============================================================

// 필요한 디렉토리 자동 생성
['input', 'output/pptx', 'output/web'].forEach(dir => {
  fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
});

process.on('uncaughtException', (err) => {
  console.error('[비정상 오류]', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[미처리 Promise]', reason);
});

const server = app.listen(PORT, () => {
  // 등록된 라우트 수 계산
  let routeCount = 0;
  app._router.stack.forEach(layer => {
    if (layer.route) {
      routeCount++;
    } else if (layer.name === 'router') {
      layer.handle.stack.forEach(r => { if (r.route) routeCount++; });
    }
  });

  console.log(`\n`);
  console.log(`  ██████╗ ██████╗ ████████╗`);
  console.log(`  ██╔══██╗██╔══██╗╚══██╔══╝`);
  console.log(`  ██████╔╝██████╔╝   ██║   `);
  console.log(`  ██╔═══╝ ██╔═══╝    ██║   `);
  console.log(`  ██║     ██║        ██║   `);
  console.log(`  ╚═╝     ╚═╝        ╚═╝   `);
  console.log(`  기업교육 발표자료 생성기 v${APP_VERSION}`);
  console.log(``);
  console.log(`  ┌─────────────────────────────────────┐`);
  console.log(`  │  URL : http://localhost:${PORT}          │`);
  console.log(`  │  라우트 : ${String(routeCount).padStart(3)} 개 등록됨            │`);
  console.log(`  │  Node  : ${process.version.padEnd(25)} │`);
  console.log(`  └─────────────────────────────────────┘`);
  console.log(`\n  [소스 디렉토리]`);
  if (sourceDirs.length === 0) {
    console.log(`    (없음)`);
  } else {
    sourceDirs.forEach((d, i) => {
      console.log(`    ${i + 1}. ${d}`);
    });
  }
  console.log(`\n  [사용법]`);
  console.log(`  1. input/ 폴더에 교육자료(PDF, DOCX, TXT) 넣기`);
  console.log(`  2. 웹 UI에서 파일 확인 또는 업로드`);
  console.log(`  3. Claude Code에게 "발표자료 만들어줘" 요청\n`);
});

// --- Graceful Shutdown ---
function gracefulShutdown(signal) {
  console.log(`\n[${signal}] 서버 종료 시작...`);
  server.close(() => {
    console.log('[서버] 모든 연결 정리 완료. 서버를 종료합니다.');
    process.exit(0);
  });
  // 5초 후 강제 종료
  setTimeout(() => {
    console.error('[서버] 강제 종료 (타임아웃 5초 초과)');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
