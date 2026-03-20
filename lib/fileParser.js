const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── 텍스트 정규화 ───────────────────────────────────────────
function normalizeText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')  // 연속 빈 줄 → 최대 1줄 빈 줄
    .replace(/[ \t]+$/gm, '')     // 줄 끝 공백 제거
    .trim();
}

// ─── 워드/캐릭터 카운트 ──────────────────────────────────────
function countStats(text) {
  if (!text) return { wordCount: 0, charCount: 0 };
  const cleaned = text.replace(/\s+/g, ' ').trim();
  // 한글+영문 혼합 카운트: 영문은 공백 기준, 한글은 글자 단위
  const koreanChars = (cleaned.match(/[\uAC00-\uD7AF]/g) || []).length;
  const nonKorean = cleaned.replace(/[\uAC00-\uD7AF]/g, ' ').trim();
  const englishWords = nonKorean ? nonKorean.split(/\s+/).filter(w => w.length > 0).length : 0;
  return {
    wordCount: koreanChars + englishWords,
    charCount: text.length
  };
}

// ─── 파일 메타데이터 ─────────────────────────────────────────
function getFileMetadata(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return {
      fileSize: stat.size,
      fileSizeFormatted: formatBytes(stat.size),
      lastModified: stat.mtime.toISOString(),
      encoding: 'utf-8'
    };
  } catch {
    return { fileSize: 0, fileSizeFormatted: '0 B', lastModified: null, encoding: 'utf-8' };
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ─── 자동 섹션 분리 ──────────────────────────────────────────
function detectSections(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const sections = [];
  let currentSection = { title: '(서론)', content: [] };

  for (const line of lines) {
    // 숫자로 시작하는 제목 패턴: "1. ", "1) ", "제1장", "Chapter 1"
    const numbered = line.match(/^(?:(\d+)[.\)]\s+(.+)|제(\d+)[장절편]\s*(.*)|Chapter\s+(\d+)[:\s]*(.*))$/i);
    // 대문자/한글 제목 패턴: 전체 대문자 행, 또는 【】로 감싸진 행
    const heading = line.match(/^(?:[A-Z][A-Z\s]{4,}$|【(.+)】|■\s*(.+)|▶\s*(.+)|━+\s*(.+))/);

    if (numbered || heading) {
      // 이전 섹션 저장
      if (currentSection.content.length > 0 || sections.length > 0) {
        currentSection.content = currentSection.content.join('\n').trim();
        if (currentSection.content) sections.push(currentSection);
      }
      const title = numbered
        ? (numbered[2] || numbered[4] || numbered[6] || line).trim()
        : (heading[1] || heading[2] || heading[3] || heading[4] || line).trim();
      currentSection = { title, content: [] };
    } else {
      currentSection.content.push(line);
    }
  }
  // 마지막 섹션
  currentSection.content = Array.isArray(currentSection.content)
    ? currentSection.content.join('\n').trim()
    : currentSection.content;
  if (currentSection.content) sections.push(currentSection);

  return sections;
}

// ─── 결과 빌더 (메타데이터 + 카운트 + 섹션 자동 부착) ──────
function buildResult(filePath, name, type, text, extra = {}) {
  const normalized = normalizeText(text);
  const stats = countStats(normalized);
  const meta = getFileMetadata(filePath);
  const sections = extra.sections || detectSections(normalized);

  return {
    name,
    type,
    text: normalized,
    ...stats,
    ...meta,
    sections: sections.length > 0 ? sections : undefined,
    ...extra
  };
}

// ─── 메인 파서 ───────────────────────────────────────────────
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
        return parseTXT(filePath, name);
      case '.md':
        return parseMD(filePath, name);
      case '.pptx':
        return await parsePPTX(filePath, name);
      case '.hwp':
        return buildResult(filePath, name, 'hwp',
          '[HWP 파일 - 수동 텍스트 변환 필요]',
          { error: 'HWP는 직접 지원하지 않습니다. TXT로 변환 후 넣어주세요.' }
        );
      default:
        return buildResult(filePath, name, ext, '',
          { error: `지원하지 않는 형식: ${ext}` }
        );
    }
  } catch (err) {
    return buildResult(filePath, name, ext, '',
      { error: err.message }
    );
  }
}

// ─── PDF 파서 (에러 복구 포함) ───────────────────────────────
async function parsePDF(filePath, name) {
  const buffer = fs.readFileSync(filePath);
  let text = '';
  let pages = 0;
  let info = {};
  let fallback = false;

  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    text = data.text;
    pages = data.numpages;
    info = data.info;
  } catch (primaryErr) {
    // 에러 복구: 바이너리에서 텍스트 문자열 패턴 탐색
    fallback = true;
    try {
      text = extractTextFromBinary(buffer);
      // PDF에서 페이지 수 추정 (/Type /Page 패턴)
      const pageMatches = buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g);
      pages = pageMatches ? pageMatches.length : 0;
    } catch {
      text = '';
    }

    if (!text) {
      return buildResult(filePath, name, 'pdf', '', {
        pages,
        info,
        error: `PDF 파싱 실패: ${primaryErr.message}`,
        fallback: true
      });
    }
  }

  return buildResult(filePath, name, 'pdf', text, {
    pages,
    info,
    ...(fallback ? { fallback: true, note: 'pdf-parse 실패로 텍스트 직접 추출 (정확도 낮음)' } : {})
  });
}

// 바이너리 버퍼에서 텍스트 문자열 추출 (PDF 에러 복구용)
function extractTextFromBinary(buffer) {
  const str = buffer.toString('latin1');
  const textSegments = [];

  // PDF 스트림 내 텍스트 오브젝트 (BT ... ET) 사이에서 문자열 추출
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(str)) !== null) {
    const block = match[1];
    // 괄호 안의 텍스트 추출
    const textInParens = block.match(/\(([^)]*)\)/g);
    if (textInParens) {
      for (const t of textInParens) {
        const cleaned = t.slice(1, -1)
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\');
        // ASCII 범위의 의미있는 텍스트만
        if (/[\x20-\x7E가-힣]{2,}/.test(cleaned)) {
          textSegments.push(cleaned);
        }
      }
    }
  }

  return textSegments.join(' ');
}

// ─── DOCX 파서 ───────────────────────────────────────────────
async function parseDOCX(filePath, name) {
  const mammoth = require('mammoth');
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return buildResult(filePath, name, 'docx', result.value);
}

// ─── TXT 파서 ────────────────────────────────────────────────
function parseTXT(filePath, name) {
  const raw = fs.readFileSync(filePath);
  // BOM 감지 및 인코딩 결정
  const encoding = detectEncoding(raw);
  const text = raw.toString(encoding === 'utf-16le' ? 'utf16le' : 'utf8');
  return buildResult(filePath, name, 'txt', text, { encoding });
}

// ─── Markdown 구조화 파서 ────────────────────────────────────
function parseMD(filePath, name) {
  const raw = fs.readFileSync(filePath);
  const encoding = detectEncoding(raw);
  const text = raw.toString(encoding === 'utf-16le' ? 'utf16le' : 'utf8');
  const sections = parseMarkdownSections(text);

  return buildResult(filePath, name, 'md', text, { sections });
}

function parseMarkdownSections(text) {
  const lines = text.split('\n');
  const sections = [];
  let current = null;
  let inCodeBlock = false;

  for (const line of lines) {
    // 코드블록 토글
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (current) current.content.push(line);
      continue;
    }

    if (inCodeBlock) {
      if (current) current.content.push(line);
      continue;
    }

    // 헤딩 감지 (# ~ ######)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      // 이전 섹션 저장
      if (current) {
        current.content = current.content.join('\n').trim();
        sections.push(current);
      }
      current = {
        level: headingMatch[1].length,
        title: headingMatch[2].trim(),
        content: [],
        items: []     // 목록 아이템
      };
      continue;
    }

    // 목록 아이템 감지
    const listMatch = line.match(/^\s*[-*+]\s+(.+)/);
    const orderedMatch = line.match(/^\s*\d+[.)]\s+(.+)/);
    if (current && (listMatch || orderedMatch)) {
      current.items.push((listMatch || orderedMatch)[1].trim());
    }

    if (current) {
      current.content.push(line);
    } else {
      // 헤딩 전 내용 → 기본 섹션 생성
      if (line.trim()) {
        current = { level: 0, title: '(intro)', content: [line], items: [] };
      }
    }
  }

  // 마지막 섹션
  if (current) {
    current.content = Array.isArray(current.content)
      ? current.content.join('\n').trim()
      : current.content;
    sections.push(current);
  }

  // items가 빈 배열이면 제거
  for (const s of sections) {
    if (s.items && s.items.length === 0) delete s.items;
  }

  return sections;
}

// ─── PPTX 텍스트 추출 (zip+xml 직접 파싱, 외부 의존성 없음) ─
async function parsePPTX(filePath, name) {
  const buffer = fs.readFileSync(filePath);
  const meta = getFileMetadata(filePath);

  try {
    const entries = parseZipEntries(buffer);
    const slideEntries = entries
      .filter(e => /^ppt\/slides\/slide\d+\.xml$/i.test(e.name))
      .sort((a, b) => {
        const numA = parseInt(a.name.match(/slide(\d+)/)[1]);
        const numB = parseInt(b.name.match(/slide(\d+)/)[1]);
        return numA - numB;
      });

    if (slideEntries.length === 0) {
      return buildResult(filePath, name, 'pptx',
        '[PPTX 파일 - 슬라이드 추출 실패]',
        { slideCount: 0, note: 'ZIP 구조에서 슬라이드를 찾을 수 없습니다.' }
      );
    }

    const slideTexts = [];
    for (let i = 0; i < slideEntries.length; i++) {
      const xmlStr = slideEntries[i].data.toString('utf8');
      const texts = extractXmlTextNodes(xmlStr);
      if (texts.length > 0) {
        slideTexts.push(`[슬라이드 ${i + 1}]\n${texts.join('\n')}`);
      }
    }

    const fullText = slideTexts.join('\n\n');
    return buildResult(filePath, name, 'pptx', fullText || '[텍스트 없음]', {
      slideCount: slideEntries.length
    });

  } catch (err) {
    // 파싱 실패 시 기본 정보라도 반환
    return buildResult(filePath, name, 'pptx',
      '[PPTX 파일 - 텍스트 추출 실패]',
      {
        note: `PPTX 파싱 실패: ${err.message}. 내용을 TXT로 변환 후 넣으면 더 정확합니다.`,
        ...meta
      }
    );
  }
}

// 간이 ZIP 파서 - 로컬 파일 헤더를 읽어 엔트리 추출 (외부 모듈 불필요)
function parseZipEntries(buffer) {
  const entries = [];
  let offset = 0;

  while (offset < buffer.length - 4) {
    // 로컬 파일 헤더 시그니처: 0x04034b50
    const sig = buffer.readUInt32LE(offset);
    if (sig !== 0x04034b50) break;

    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);

    const nameStart = offset + 30;
    const fileName = buffer.toString('utf8', nameStart, nameStart + nameLength);

    const dataStart = nameStart + nameLength + extraLength;
    const rawData = buffer.slice(dataStart, dataStart + compressedSize);

    let data;
    if (compressionMethod === 0) {
      // 저장됨 (비압축)
      data = rawData;
    } else if (compressionMethod === 8) {
      // Deflate
      try {
        data = zlib.inflateRawSync(rawData);
      } catch {
        data = Buffer.alloc(0);
      }
    } else {
      data = Buffer.alloc(0);
    }

    entries.push({ name: fileName, data, compressedSize, uncompressedSize });
    offset = dataStart + compressedSize;
  }

  return entries;
}

// XML에서 <a:t> 텍스트 노드 추출 (OOXML 슬라이드 텍스트)
function extractXmlTextNodes(xml) {
  const texts = [];

  // 줄바꿈은 </a:p> 기준
  const parts = xml.split(/<\/a:p>/);
  for (const part of parts) {
    const lineTexts = [];
    const innerRegex = /<a:t[^>]*>([^<]*)<\/a:t>/g;
    let im;
    while ((im = innerRegex.exec(part)) !== null) {
      const t = im[1].trim();
      if (t) lineTexts.push(t);
    }
    if (lineTexts.length > 0) {
      texts.push(lineTexts.join(' '));
    }
  }

  return texts;
}

// ─── 인코딩 감지 ─────────────────────────────────────────────
function detectEncoding(buffer) {
  if (buffer.length >= 2) {
    // UTF-16 LE BOM
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) return 'utf-16le';
    // UTF-16 BE BOM
    if (buffer[0] === 0xFE && buffer[1] === 0xFF) return 'utf-16be';
  }
  if (buffer.length >= 3) {
    // UTF-8 BOM
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) return 'utf-8-bom';
  }
  return 'utf-8';
}

// ─── 전체 파일 파서 (병렬 + 진행 콜백) ──────────────────────
async function parseAllFiles(inputDir, onProgress) {
  const files = fs.readdirSync(inputDir)
    .filter(f => !f.startsWith('.'));

  const filePaths = [];
  for (const file of files) {
    const filePath = path.join(inputDir, file);
    try {
      const stat = fs.statSync(filePath);
      if (stat.isFile()) filePaths.push(filePath);
    } catch {
      // stat 실패한 파일은 건너뜀
    }
  }

  const total = filePaths.length;
  let completed = 0;

  const results = await Promise.all(
    filePaths.map(async (filePath) => {
      const result = await parseFile(filePath);
      completed++;
      if (typeof onProgress === 'function') {
        onProgress({ completed, total, file: path.basename(filePath) });
      }
      return result;
    })
  );

  return results;
}

module.exports = { parseFile, parseAllFiles };
