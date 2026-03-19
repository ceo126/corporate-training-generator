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
].filter(d => fs.existsSync(d));

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
    cb(null, originalName);
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
  const files = [];
  for (const dir of sourceDirs) {
    if (!fs.existsSync(dir)) continue;
    scanDir(dir, dir, files);
  }
  res.json({ files });
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
  const pptxDir = path.join(__dirname, 'output/pptx');
  const webDir = path.join(__dirname, 'output/web');

  const pptxFiles = fs.existsSync(pptxDir)
    ? fs.readdirSync(pptxDir).filter(f => f.endsWith('.pptx')).map(f => ({
        name: f,
        type: 'pptx',
        path: `/output/pptx/${f}`,
        modified: fs.statSync(path.join(pptxDir, f)).mtime
      }))
    : [];

  const webFiles = fs.existsSync(webDir)
    ? fs.readdirSync(webDir).filter(f => f.endsWith('.html')).map(f => ({
        name: f,
        type: 'web',
        path: `/output/web/${f}`,
        modified: fs.statSync(path.join(webDir, f)).mtime
      }))
    : [];

  const all = [...pptxFiles, ...webFiles].sort((a, b) => new Date(b.modified) - new Date(a.modified));
  res.json({ outputs: all });
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

// ============ 파일 파싱 ============

app.post('/api/parse', async (req, res) => {
  try {
    const { filePath, sourceDir } = req.body;
    if (!filePath) return res.status(400).json({ error: '파일 경로가 필요합니다' });
    const fullPath = path.join(sourceDir || path.join(__dirname, 'input'), filePath);
    // 소스 디렉토리 내 파일인지 확인
    const resolvedDir = path.resolve(sourceDir || path.join(__dirname, 'input'));
    if (!path.resolve(fullPath).startsWith(resolvedDir + path.sep) && path.resolve(fullPath) !== resolvedDir) {
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

// ============ 시작 ============

// 필요한 디렉토리 자동 생성
['input', 'output/pptx', 'output/web'].forEach(dir => {
  fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  기업교육 발표자료 생성기 v1.0`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`========================================`);
  console.log(`\n[사용법]`);
  console.log(`1. input/ 폴더에 교육자료(PDF, DOCX, TXT) 넣기`);
  console.log(`2. 웹 UI에서 파일 확인 또는 업로드`);
  console.log(`3. Claude Code에게 "발표자료 만들어줘" 요청\n`);
});
