const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = 8220;

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

// input 폴더 파일 목록
app.get('/api/files', (req, res) => {
  const inputDir = path.join(__dirname, 'input');
  if (!fs.existsSync(inputDir)) {
    return res.json({ files: [] });
  }
  const files = fs.readdirSync(inputDir)
    .filter(f => !f.startsWith('.'))
    .map(f => {
      const stat = fs.statSync(path.join(inputDir, f));
      const ext = path.extname(f).toLowerCase();
      return {
        name: f,
        size: stat.size,
        type: ext,
        modified: stat.mtime
      };
    });
  res.json({ files });
});

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
