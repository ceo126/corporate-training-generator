const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const fileParser = require('../lib/fileParser');

const FIXTURES_DIR = path.join(__dirname, '_fixtures');

// Helper: create a temp file for testing
function createFixture(name, content, encoding = 'utf8') {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  const filePath = path.join(FIXTURES_DIR, name);
  fs.writeFileSync(filePath, content, encoding);
  return filePath;
}

function cleanFixtures() {
  if (fs.existsSync(FIXTURES_DIR)) {
    fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
  }
}

describe('fileParser', () => {
  before(() => {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  });

  after(() => {
    cleanFixtures();
  });

  // ── parseTXT ──────────────────────────────────────────────

  describe('parseTXT with Korean text', () => {
    it('should parse Korean text correctly', async () => {
      const filePath = createFixture('korean.txt', '안녕하세요\n이것은 테스트 파일입니다.\n한글 텍스트를 파싱합니다.');
      const result = await fileParser.parseFile(filePath);

      assert.strictEqual(result.name, 'korean.txt');
      assert.strictEqual(result.type, 'txt');
      assert.ok(result.text.includes('안녕하세요'));
      assert.ok(result.text.includes('테스트'));
      assert.ok(result.wordCount > 0, 'wordCount should be > 0');
      assert.ok(result.charCount > 0, 'charCount should be > 0');
    });
  });

  describe('parseTXT with empty file', () => {
    it('should handle empty file gracefully', async () => {
      const filePath = createFixture('empty.txt', '');
      const result = await fileParser.parseFile(filePath);

      assert.strictEqual(result.name, 'empty.txt');
      assert.strictEqual(result.type, 'txt');
      assert.strictEqual(result.text, '');
      assert.strictEqual(result.wordCount, 0);
      assert.strictEqual(result.charCount, 0);
    });
  });

  // ── parseMD ───────────────────────────────────────────────

  describe('parseMD with headings and lists', () => {
    it('should detect sections from markdown headings', async () => {
      const md = `# 제목 1

첫 번째 섹션 내용입니다.

- 항목 1
- 항목 2
- 항목 3

## 제목 2

두 번째 섹션 내용입니다.

1. 순서 항목 1
2. 순서 항목 2

### 제목 3

세 번째 섹션 내용입니다.`;

      const filePath = createFixture('headings.md', md);
      const result = await fileParser.parseFile(filePath);

      assert.strictEqual(result.name, 'headings.md');
      assert.strictEqual(result.type, 'md');
      assert.ok(result.text.includes('제목 1'));
      assert.ok(Array.isArray(result.sections), 'sections should be an array');
      assert.ok(result.sections.length >= 3, `expected at least 3 sections, got ${result.sections.length}`);

      // Check that sections have title and level properties
      const h1Section = result.sections.find(s => s.title === '제목 1');
      assert.ok(h1Section, 'should find h1 section');
      assert.strictEqual(h1Section.level, 1);

      const h2Section = result.sections.find(s => s.title === '제목 2');
      assert.ok(h2Section, 'should find h2 section');
      assert.strictEqual(h2Section.level, 2);

      // Check items extraction from list
      assert.ok(h1Section.items, 'h1 section should have items');
      assert.ok(h1Section.items.length >= 3, 'h1 section should have at least 3 list items');
    });
  });

  // ── parseFile with unsupported extension ──────────────────

  describe('parseFile with unsupported extension', () => {
    it('should return error for unsupported file type', async () => {
      const filePath = createFixture('test.xyz', 'some content');
      const result = await fileParser.parseFile(filePath);

      assert.strictEqual(result.name, 'test.xyz');
      assert.ok(result.error, 'should have an error property');
      assert.ok(result.error.includes('지원하지 않는'), `error message should mention unsupported format, got: ${result.error}`);
    });
  });

  // ── parseFile with nonexistent file ───────────────────────

  describe('parseFile with nonexistent file', () => {
    it('should return error for missing file', async () => {
      const result = await fileParser.parseFile(path.join(FIXTURES_DIR, 'does-not-exist.txt'));

      assert.ok(result.error, 'should have an error property');
    });
  });

  // ── word count and char count accuracy ────────────────────

  describe('word count and char count accuracy', () => {
    it('should count Korean chars as individual words', async () => {
      // "한글테스트" = 5 Korean chars = 5 words
      const filePath = createFixture('count.txt', '한글테스트');
      const result = await fileParser.parseFile(filePath);

      assert.strictEqual(result.charCount, 5);
      assert.strictEqual(result.wordCount, 5, 'each Korean char counts as a word');
    });

    it('should count English words by spaces', async () => {
      const filePath = createFixture('english.txt', 'hello world test');
      const result = await fileParser.parseFile(filePath);

      assert.strictEqual(result.wordCount, 3);
    });

    it('should handle mixed Korean and English', async () => {
      const filePath = createFixture('mixed.txt', '안녕 hello world');
      const result = await fileParser.parseFile(filePath);

      // '안녕' = 2 Korean chars = 2 words, 'hello world' = 2 English words
      assert.strictEqual(result.wordCount, 4);
    });
  });

  // ── text normalization (consecutive blank lines) ──────────

  describe('text normalization', () => {
    it('should collapse consecutive blank lines to at most one', async () => {
      const text = 'line1\n\n\n\n\nline2\n\n\n\nline3';
      const filePath = createFixture('blanks.txt', text);
      const result = await fileParser.parseFile(filePath);

      // After normalization: consecutive blank lines become \n\n (max 1 blank line)
      assert.ok(!result.text.includes('\n\n\n'), 'should not have 3+ consecutive newlines');
      assert.ok(result.text.includes('line1\n\nline2'), 'should preserve double newline');
    });

    it('should trim trailing whitespace from lines', async () => {
      const text = 'hello   \nworld   \n';
      const filePath = createFixture('trailing.txt', text);
      const result = await fileParser.parseFile(filePath);

      const lines = result.text.split('\n');
      for (const line of lines) {
        assert.strictEqual(line, line.trimEnd(), `line "${line}" should not have trailing whitespace`);
      }
    });

    it('should normalize CRLF to LF', async () => {
      const text = 'line1\r\nline2\r\nline3';
      const filePath = createFixture('crlf.txt', text);
      const result = await fileParser.parseFile(filePath);

      assert.ok(!result.text.includes('\r'), 'should not contain CR');
    });
  });

  // ── auto section detection ────────────────────────────────

  describe('auto section detection', () => {
    it('should detect numbered sections like "1. Title"', async () => {
      const text = `1. 서론
서론 내용입니다.

2. 본론
본론 내용입니다.

3. 결론
결론 내용입니다.`;
      const filePath = createFixture('numbered.txt', text);
      const result = await fileParser.parseFile(filePath);

      assert.ok(result.sections, 'should have sections');
      assert.ok(result.sections.length >= 3, `expected at least 3 sections, got ${result.sections.length}`);
    });

    it('should detect bracket-style sections like 【제목】', async () => {
      const text = `【개요】
개요 내용입니다.

【상세】
상세 내용입니다.`;
      const filePath = createFixture('bracket.txt', text);
      const result = await fileParser.parseFile(filePath);

      assert.ok(result.sections, 'should have sections');
      assert.ok(result.sections.length >= 2, `expected at least 2 sections, got ${result.sections.length}`);
    });
  });
});
