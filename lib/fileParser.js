const fs = require('fs');
const path = require('path');

async function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath);

  try {
    switch (ext) {
      case '.pdf':
        return await parsePDF(filePath, name);
      case '.docx':
        return await parseDOCX(filePath, name);
      case '.txt':
      case '.md':
        return parseTXT(filePath, name);
      case '.hwp':
        return { name, type: 'hwp', text: '[HWP 파일 - 수동 텍스트 변환 필요]', error: 'HWP는 직접 지원하지 않습니다. TXT로 변환 후 넣어주세요.' };
      default:
        return { name, type: ext, text: '', error: `지원하지 않는 형식: ${ext}` };
    }
  } catch (err) {
    return { name, type: ext, text: '', error: err.message };
  }
}

async function parsePDF(filePath, name) {
  const pdfParse = require('pdf-parse');
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return {
    name,
    type: 'pdf',
    text: data.text,
    pages: data.numpages,
    info: data.info
  };
}

async function parseDOCX(filePath, name) {
  const mammoth = require('mammoth');
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return {
    name,
    type: 'docx',
    text: result.value
  };
}

function parseTXT(filePath, name) {
  const text = fs.readFileSync(filePath, 'utf8');
  return {
    name,
    type: 'txt',
    text
  };
}

async function parseAllFiles(inputDir) {
  const files = fs.readdirSync(inputDir)
    .filter(f => !f.startsWith('.'));

  const results = [];
  for (const file of files) {
    const filePath = path.join(inputDir, file);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      const parsed = await parseFile(filePath);
      results.push(parsed);
    }
  }
  return results;
}

module.exports = { parseFile, parseAllFiles };
