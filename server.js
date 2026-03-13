const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = 8220;

// 외부 소스 폴더 설정 (여러 경로 등록 가능)
let sourceDirs = [
  path.join(__dirname, 'input'),
  'D:/0000.유벤치/기업교육 자료'
];

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));
app.use('/output', express.static('output'));
app.use('/reveal', express.static(path.join(__dirname, 'node_modules/reveal.js')));

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'input/'),
  filename: (req, file, cb) => {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, originalName);
  }
});
const upload = multer({ storage });

// 외부 소스 폴더 추가
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

// 소스 폴더 목록
app.get('/api/sources', (req, res) => {
  res.json({ sources: sourceDirs });
});

// 소스 폴더 제거
app.delete('/api/source', (req, res) => {
  const { dirPath } = req.body;
  const resolved = path.resolve(dirPath);
  sourceDirs = sourceDirs.filter(d => d !== resolved);
  res.json({ success: true, sources: sourceDirs });
});

// 지원 파일 확장자
const SUPPORTED_EXT = ['.pdf', '.docx', '.txt', '.md', '.pptx', '.hwp'];

// 모든 소스 폴더에서 파일 목록 (하위 폴더 포함)
app.get('/api/files', (req, res) => {
  const files = [];
  for (const dir of sourceDirs) {
    if (!fs.existsSync(dir)) continue;
    scanDir(dir, dir, files);
  }
  res.json({ files });
});

function scanDir(baseDir, currentDir, files) {
  const entries = fs.readdirSync(currentDir);
  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
    const fullPath = path.join(currentDir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(baseDir, fullPath, files);
    } else {
      const ext = path.extname(entry).toLowerCase();
      if (SUPPORTED_EXT.includes(ext)) {
        const relativePath = path.relative(baseDir, fullPath);
        files.push({
          name: entry,
          path: fullPath,
          relativePath,
          sourceDir: baseDir,
          size: stat.size,
          type: ext,
          modified: stat.mtime
        });
      }
    }
  }
}

// 파일 업로드
app.post('/api/upload', upload.array('files'), (req, res) => {
  res.json({ success: true, count: req.files.length });
});

// 파일 삭제
app.delete('/api/files/:name', (req, res) => {
  const filePath = path.join(__dirname, 'input', req.params.name);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: '파일을 찾을 수 없습니다' });
  }
});

// 생성된 결과물 목록
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

  res.json({ outputs: [...pptxFiles, ...webFiles] });
});

// 에디터 페이지
app.get('/editor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/editor.html'));
});

// JSON 데이터로 웹 발표자료 생성
app.post('/api/generate/web-from-data', (req, res) => {
  try {
    const { filename, slides, theme } = req.body;
    const webGenerator = require('./lib/webGenerator');
    const html = webGenerator.generateHTML(slides, { theme, title: slides.cover?.title || 'Presentation' });
    const outputPath = path.join(__dirname, 'output/web', filename);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html, 'utf8');
    res.json({ success: true, path: `/output/web/${filename}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 웹 발표자료 데이터 저장 (Claude Code에서 호출)
app.post('/api/generate/web', (req, res) => {
  const { filename, html } = req.body;
  const outputPath = path.join(__dirname, 'output/web', filename);
  fs.writeFileSync(outputPath, html, 'utf8');
  res.json({ success: true, path: `/output/web/${filename}` });
});

// PPT 데이터 저장 (Claude Code에서 호출)
app.post('/api/generate/pptx', async (req, res) => {
  try {
    const { filename, slides, theme } = req.body;
    const pptGenerator = require('./lib/pptGenerator');
    const outputPath = await pptGenerator.generate(slides, theme, filename);
    res.json({ success: true, path: outputPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
