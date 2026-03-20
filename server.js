const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const webGenerator = require('./lib/webGenerator');
const pptGenerator = require('./lib/pptGenerator');
const fileParser = require('./lib/fileParser');

const app = express();
const PORT = 8220;

// 외부 소스 폴더 설정 (여러 경로 등록 가능)
let sourceDirs = [
  path.join(__dirname, 'input'),
  'D:/0000.유벤치/기업교육 자료'
].map(d => path.resolve(d)).filter(d => fs.existsSync(d));

// ============ CORS 헤더 ============
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ============ 요청 로깅 미들웨어 ============
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));
app.use('/output', express.static('output'));

// 지원 파일 확장자
const SUPPORTED_EXT = ['.pdf', '.docx', '.txt', '.md', '.pptx', '.hwp'];

// 파일 업로드 설정
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
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (SUPPORTED_EXT.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`지원하지 않는 파일 형식: ${ext}`));
    }
  }
});

// ============ 소스 폴더 관리 ============

app.get('/api/sources', (req, res) => {
  res.json({ sources: sourceDirs });
});

app.post('/api/source', (req, res) => {
  const { dirPath } = req.body;
  if (!dirPath) return res.status(400).json({ error: '경로를 입력해주세요' });
  const resolved = path.resolve(dirPath);
  if (!fs.existsSync(resolved)) return res.status(404).json({ error: '폴더를 찾을 수 없습니다: ' + resolved });
  if (!sourceDirs.includes(resolved)) {
    sourceDirs.push(resolved);
  }
  res.json({ success: true, sources: sourceDirs });
});

app.delete('/api/source', (req, res) => {
  const { dirPath } = req.body;
  const resolved = path.resolve(dirPath);
  sourceDirs = sourceDirs.filter(d => d !== resolved);
  res.json({ success: true, sources: sourceDirs });
});

// ============ 파일 관리 ============

app.get('/api/files', (req, res) => {
  try {
    const files = [];
    for (const dir of sourceDirs) {
      if (!fs.existsSync(dir)) continue;
      scanDir(dir, dir, files);
    }
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: '파일 목록 조회 실패: ' + err.message });
  }
});

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

app.post('/api/upload', (req, res, next) => {
  upload.array('files')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json({ success: true, count: req.files.length });
  });
});

app.delete('/api/files/:name', (req, res) => {
  const inputDir = path.join(__dirname, 'input');
  const filePath = path.join(inputDir, req.params.name);
  // Path Traversal 방지
  if (!filePath.startsWith(inputDir + path.sep)) {
    return res.status(400).json({ error: '잘못된 파일 경로입니다' });
  }
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: '파일을 찾을 수 없습니다' });
  }
});

// ============ 결과물 관리 ============

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
    res.status(500).json({ error: '결과물 목록 조회 실패: ' + err.message });
  }
});

app.delete('/api/outputs/:type/:name', (req, res) => {
  const { type, name } = req.params;
  if (type !== 'pptx' && type !== 'web') {
    return res.status(400).json({ error: '잘못된 타입입니다' });
  }
  const dir = type === 'pptx' ? 'output/pptx' : 'output/web';
  const outputDir = path.join(__dirname, dir);
  const filePath = path.join(outputDir, name);
  // Path Traversal 방지
  if (!filePath.startsWith(outputDir + path.sep)) {
    return res.status(400).json({ error: '잘못된 경로입니다' });
  }
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: '파일을 찾을 수 없습니다' });
  }
});

// ============ 결과물 이름 변경 ============

app.post('/api/outputs/:type/:name/rename', (req, res) => {
  const { type, name } = req.params;
  const { newName } = req.body;
  if (type !== 'pptx' && type !== 'web') {
    return res.status(400).json({ error: '잘못된 타입입니다' });
  }
  if (!newName || typeof newName !== 'string' || newName.includes('/') || newName.includes('\\') || newName.includes('..')) {
    return res.status(400).json({ error: '잘못된 파일명입니다' });
  }
  const dir = type === 'pptx' ? 'output/pptx' : 'output/web';
  const outputDir = path.join(__dirname, dir);
  const oldPath = path.join(outputDir, name);
  const newPath = path.join(outputDir, newName);
  // Path Traversal 방지
  if (!oldPath.startsWith(outputDir + path.sep) || !newPath.startsWith(outputDir + path.sep)) {
    return res.status(400).json({ error: '잘못된 경로입니다' });
  }
  if (!fs.existsSync(oldPath)) {
    return res.status(404).json({ error: '파일을 찾을 수 없습니다' });
  }
  if (fs.existsSync(newPath)) {
    return res.status(409).json({ error: '같은 이름의 파일이 이미 존재합니다' });
  }
  try {
    fs.renameSync(oldPath, newPath);
    res.json({ success: true, newName });
  } catch(e) {
    res.status(500).json({ error: '이름 변경 실패: ' + e.message });
  }
});

// ============ 결과물 복제 ============

app.post('/api/outputs/:type/:name/duplicate', (req, res) => {
  const { type, name } = req.params;
  if (type !== 'pptx' && type !== 'web') {
    return res.status(400).json({ error: '잘못된 타입입니다' });
  }
  const dir = type === 'pptx' ? 'output/pptx' : 'output/web';
  const outputDir = path.join(__dirname, dir);
  const srcPath = path.join(outputDir, path.basename(name));
  if (!srcPath.startsWith(outputDir + path.sep) && srcPath !== outputDir + path.sep + path.basename(name)) {
    return res.status(400).json({ error: '잘못된 경로입니다' });
  }
  if (!fs.existsSync(srcPath)) {
    return res.status(404).json({ error: '파일을 찾을 수 없습니다' });
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
    res.status(500).json({ error: '복제 실패: ' + e.message });
  }
});

// ============ 파일 파싱 ============

app.post('/api/parse', async (req, res) => {
  try {
    const { filePath, sourceDir } = req.body;
    if (!filePath) return res.status(400).json({ error: '파일 경로가 필요합니다' });

    // sourceDir이 등록된 소스 디렉토리인지 검증
    const resolvedDir = path.resolve(sourceDir || path.join(__dirname, 'input'));
    if (!sourceDirs.includes(resolvedDir)) {
      return res.status(403).json({ error: '등록되지 않은 소스 디렉토리입니다' });
    }

    const fullPath = path.join(resolvedDir, filePath);
    // Path Traversal 방지
    if (!path.resolve(fullPath).startsWith(resolvedDir + path.sep)) {
      return res.status(400).json({ error: '잘못된 파일 경로입니다' });
    }
    const result = await fileParser.parseFile(fullPath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ 생성 ============

app.get('/editor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/editor.html'));
});

app.get('/templates', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/templates.html'));
});

app.post('/api/generate/web-from-data', (req, res) => {
  try {
    const { filename, slides, theme } = req.body;
    const safeName = path.basename(filename);
    if (!safeName || safeName.startsWith('.')) {
      return res.status(400).json({ error: '잘못된 파일명입니다' });
    }
    const html = webGenerator.generateHTML(slides, { theme, title: slides.cover?.title || 'Presentation' });
    const outputDir = path.join(__dirname, 'output/web');
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, safeName), html, 'utf8');
    res.json({ success: true, path: `/output/web/${safeName}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate/web', (req, res) => {
  try {
    const { filename, html } = req.body;
    const safeName = path.basename(filename);
    if (!safeName || safeName.startsWith('.')) {
      return res.status(400).json({ error: '잘못된 파일명입니다' });
    }
    const outputDir = path.join(__dirname, 'output/web');
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, safeName), html, 'utf8');
    res.json({ success: true, path: `/output/web/${safeName}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate/pptx', async (req, res) => {
  try {
    const { filename, slides, theme } = req.body;
    const safeName = path.basename(filename);
    if (!safeName || safeName.startsWith('.')) {
      return res.status(400).json({ error: '잘못된 파일명입니다' });
    }
    const outputPath = await pptGenerator.generate(slides, theme, safeName);
    res.json({ success: true, path: outputPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ 서버 상태 확인 ============

const SERVER_START_TIME = Date.now();

app.get('/api/health', (req, res) => {
  try {
    const mem = process.memoryUsage();
    // 파일 수 카운트
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
    res.status(500).json({ error: '상태 확인 실패: ' + err.message });
  }
});

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

// ============ 템플릿 목록 ============

app.get('/api/templates', (req, res) => {
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

// ============ 테마 목록 ============

app.get('/api/themes', (req, res) => {
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

// ============ 웹 미리보기 HTML 생성 ============

app.post('/api/preview', (req, res) => {
  try {
    const { slides, theme } = req.body;
    if (!slides) {
      return res.status(400).json({ error: '슬라이드 데이터가 필요합니다' });
    }
    const html = webGenerator.generateHTML(slides, { theme: theme || 'modern', title: slides.cover?.title || 'Preview' });
    res.json({ success: true, html });
  } catch (err) {
    res.status(500).json({ error: '미리보기 생성 실패: ' + err.message });
  }
});

// ============ 파일 내용 미리보기 ============

app.get('/api/files/:sourceDir/:filePath/preview', async (req, res) => {
  try {
    const { sourceDir, filePath } = req.params;

    // sourceDir은 base64로 인코딩되어 전달됨
    let decodedDir;
    try {
      decodedDir = Buffer.from(sourceDir, 'base64').toString('utf8');
    } catch {
      return res.status(400).json({ error: '잘못된 소스 디렉토리 인코딩입니다' });
    }

    const resolvedDir = path.resolve(decodedDir);
    if (!sourceDirs.includes(resolvedDir)) {
      return res.status(403).json({ error: '등록되지 않은 소스 디렉토리입니다' });
    }

    let decodedPath;
    try {
      decodedPath = Buffer.from(filePath, 'base64').toString('utf8');
    } catch {
      return res.status(400).json({ error: '잘못된 파일 경로 인코딩입니다' });
    }

    const fullPath = path.join(resolvedDir, decodedPath);

    // Path traversal 방지
    if (!path.resolve(fullPath).startsWith(resolvedDir + path.sep) && path.resolve(fullPath) !== resolvedDir) {
      return res.status(400).json({ error: '잘못된 파일 경로입니다' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: '파일을 찾을 수 없습니다' });
    }

    const result = await fileParser.parseFile(fullPath);
    const maxPreviewLength = 5000;
    const preview = result.text ? result.text.substring(0, maxPreviewLength) : '';
    const truncated = result.text && result.text.length > maxPreviewLength;

    res.json({
      name: result.name,
      type: result.type,
      preview,
      truncated,
      fullLength: result.text ? result.text.length : 0,
      pages: result.pages || null,
      error: result.error || null
    });
  } catch (err) {
    res.status(500).json({ error: '파일 미리보기 실패: ' + err.message });
  }
});

// ============ 일괄 생성 (Bulk) ============

app.post('/api/generate/bulk', async (req, res) => {
  try {
    const { files, outputType, theme } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: '파일 목록이 필요합니다' });
    }
    if (!outputType || !['web', 'pptx'].includes(outputType)) {
      return res.status(400).json({ error: 'outputType은 web 또는 pptx여야 합니다' });
    }
    if (files.length > 20) {
      return res.status(400).json({ error: '한 번에 최대 20개 파일까지 처리 가능합니다' });
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

    res.json({
      success: true,
      total: files.length,
      successCount,
      errorCount,
      results
    });
  } catch (err) {
    res.status(500).json({ error: '일괄 생성 실패: ' + err.message });
  }
});

// ============ 페이지 라우트 ============

app.get('/presenter', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/presenter.html'));
});

// ============ API 문서 ============

app.get('/api/docs', (req, res) => {
  const docs = [
    {
      method: 'GET', path: '/api/health',
      description: '서버 상태 확인 (업타임, 메모리, 파일 수)',
      requestBody: null,
      response: '{ status, uptime, uptimeFormatted, memory, files, sourceDirs, nodeVersion }'
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
    }
  ];
  res.json({ version: '2.0.0', totalEndpoints: docs.length, endpoints: docs });
});

// ============ 상세 통계 ============

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

    // 가장 최근 생성 시간
    let lastGenerated = null;
    if (allOutputs.length > 0) {
      const sorted = allOutputs.sort((a, b) => new Date(b.modified) - new Date(a.modified));
      lastGenerated = { name: sorted[0].name, type: sorted[0].type, modified: sorted[0].modified };
    }

    // 가장 큰 파일
    let largestFile = null;
    if (allOutputs.length > 0) {
      const sorted = [...allOutputs].sort((a, b) => b.size - a.size);
      largestFile = { name: sorted[0].name, type: sorted[0].type, size: sorted[0].size, sizeFormatted: formatSize(sorted[0].size) };
    }

    // 총 input 파일 크기
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
    res.status(500).json({ error: '통계 조회 실패: ' + err.message });
  }
});

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

// ============ 결과물 목록 + 다운로드 링크 ============

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
    res.status(500).json({ error: '내보내기 목록 조회 실패: ' + err.message });
  }
});

// ============ 글로벌 에러 핸들러 ============

app.use((err, req, res, _next) => {
  console.error('[서버 에러]', err.message);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다' });
});

// ============ 시작 ============

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

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  기업교육 발표자료 생성기 v2.0`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`========================================`);
  console.log(`\n[사용법]`);
  console.log(`1. input/ 폴더에 교육자료(PDF, DOCX, TXT) 넣기`);
  console.log(`2. 웹 UI에서 파일 확인 또는 업로드`);
  console.log(`3. Claude Code에게 "발표자료 만들어줘" 요청\n`);
});
