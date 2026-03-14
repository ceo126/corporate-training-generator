const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const THEMES = {
  modern: {
    name: '모던 블루',
    primary: '2563EB',
    secondary: '1E40AF',
    accent: '3B82F6',
    bg: 'F8FAFC',
    text: '1E293B',
    lightText: '64748B',
    gradient: ['2563EB', '7C3AED']
  },
  light: {
    name: '라이트',
    primary: '2563EB',
    secondary: '1E40AF',
    accent: '3B82F6',
    bg: 'FFFFFF',
    text: '1E293B',
    lightText: '64748B',
    gradient: ['2563EB', '7C3AED']
  },
  dark: {
    name: '다크 모드',
    primary: '8B5CF6',
    secondary: '6D28D9',
    accent: 'A78BFA',
    bg: '0F172A',
    text: 'F1F5F9',
    lightText: '94A3B8',
    gradient: ['8B5CF6', 'EC4899']
  },
  corporate: {
    name: '기업 스타일',
    primary: '0F766E',
    secondary: '115E59',
    accent: '14B8A6',
    bg: 'FFFFFF',
    text: '1E293B',
    lightText: '64748B',
    gradient: ['0F766E', '0284C7']
  },
  warm: {
    name: '따뜻한 오렌지',
    primary: 'EA580C',
    secondary: 'C2410C',
    accent: 'F97316',
    bg: 'FFFBEB',
    text: '1C1917',
    lightText: '78716C',
    gradient: ['EA580C', 'DC2626']
  }
};

async function generate(slides, themeName = 'modern', filename = 'presentation.pptx') {
  const theme = THEMES[themeName] || THEMES.modern;
  const pptx = new PptxGenJS();

  pptx.layout = 'LAYOUT_WIDE'; // 16:9
  pptx.author = 'AI 교육 발표자료 생성기';

  // 표지 슬라이드
  if (slides.cover) {
    const coverSlide = pptx.addSlide();
    coverSlide.background = { fill: theme.primary };

    coverSlide.addText(slides.cover.title, {
      x: 0.8, y: 1.5, w: 11.5, h: 1.5,
      fontSize: 48, fontFace: 'Pretendard,맑은 고딕',
      color: 'FFFFFF', bold: true, align: 'left'
    });

    if (slides.cover.subtitle) {
      coverSlide.addText(slides.cover.subtitle, {
        x: 0.8, y: 3.2, w: 11.5, h: 0.8,
        fontSize: 24, fontFace: 'Pretendard,맑은 고딕',
        color: 'FFFFFF', align: 'left', transparency: 30
      });
    }

    if (slides.cover.presenter) {
      coverSlide.addText(slides.cover.presenter, {
        x: 0.8, y: 4.5, w: 11.5, h: 0.5,
        fontSize: 16, fontFace: 'Pretendard,맑은 고딕',
        color: 'FFFFFF', align: 'left', transparency: 40
      });
    }

    // 장식 라인
    coverSlide.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: 3.0, w: 3, h: 0.05, fill: { color: 'FFFFFF' }
    });
  }

  // 목차 슬라이드
  if (slides.toc && slides.toc.length > 0) {
    const tocSlide = pptx.addSlide();
    tocSlide.background = { fill: theme.bg };

    tocSlide.addText('목차', {
      x: 0.8, y: 0.4, w: 5, h: 0.8,
      fontSize: 32, fontFace: 'Pretendard,맑은 고딕',
      color: theme.primary, bold: true
    });

    tocSlide.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: 1.1, w: 2, h: 0.04, fill: { color: theme.primary }
    });

    slides.toc.forEach((item, i) => {
      tocSlide.addText(`${String(i + 1).padStart(2, '0')}`, {
        x: 0.8, y: 1.6 + i * 0.7, w: 0.8, h: 0.5,
        fontSize: 24, fontFace: 'Pretendard,맑은 고딕',
        color: theme.primary, bold: true
      });
      tocSlide.addText(item, {
        x: 1.7, y: 1.6 + i * 0.7, w: 10, h: 0.5,
        fontSize: 18, fontFace: 'Pretendard,맑은 고딕',
        color: theme.text
      });
    });
  }

  // 내용 슬라이드들
  if (slides.content && slides.content.length > 0) {
    let slideNum = 0;

    for (const section of slides.content) {
      // 섹션 구분 슬라이드
      if (section.isSection) {
        const sectionSlide = pptx.addSlide();
        sectionSlide.background = { fill: theme.secondary };

        sectionSlide.addText(section.sectionNumber || '', {
          x: 0.8, y: 1.0, w: 2, h: 1,
          fontSize: 60, fontFace: 'Pretendard,맑은 고딕',
          color: 'FFFFFF', bold: true, transparency: 30
        });

        sectionSlide.addText(section.title, {
          x: 0.8, y: 2.2, w: 11.5, h: 1.2,
          fontSize: 44, fontFace: 'Pretendard,맑은 고딕',
          color: 'FFFFFF', bold: true
        });

        if (section.description) {
          sectionSlide.addText(section.description, {
            x: 0.8, y: 3.5, w: 11.5, h: 0.8,
            fontSize: 16, fontFace: 'Pretendard,맑은 고딕',
            color: 'FFFFFF', transparency: 30
          });
        }
        slideNum++;
        continue;
      }

      const slide = pptx.addSlide();
      slide.background = { fill: theme.bg };

      // 상단 컬러 바
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: theme.primary }
      });

      // 제목
      slide.addText(section.title, {
        x: 0.8, y: 0.3, w: 11.5, h: 0.7,
        fontSize: 32, fontFace: 'Pretendard,맑은 고딕',
        color: theme.primary, bold: true
      });

      // 구분선
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.8, y: 1.0, w: 1.5, h: 0.03, fill: { color: theme.accent }
      });

      // 내용 타입별 처리
      if (section.type === 'bullets') {
        const bullets = (section.items || []).map(item => ({
          text: item,
          options: {
            fontSize: 20, fontFace: 'Pretendard,맑은 고딕',
            color: theme.text, bullet: { code: '25CF', color: theme.primary },
            spacing: { before: 8, after: 8 }
          }
        }));
        slide.addText(bullets, {
          x: 0.8, y: 1.3, w: 11.5, h: 5.5,
          valign: 'top'
        });
      } else if (section.type === 'two-column') {
        // 왼쪽
        slide.addText(section.leftTitle || '', {
          x: 0.8, y: 1.3, w: 5.5, h: 0.5,
          fontSize: 18, fontFace: 'Pretendard,맑은 고딕',
          color: theme.secondary, bold: true
        });
        const leftBullets = (section.leftItems || []).map(item => ({
          text: item,
          options: {
            fontSize: 14, fontFace: 'Pretendard,맑은 고딕',
            color: theme.text, bullet: { code: '25CF', color: theme.primary },
            spacing: { before: 6, after: 6 }
          }
        }));
        slide.addText(leftBullets, {
          x: 0.8, y: 1.9, w: 5.5, h: 4.5, valign: 'top'
        });

        // 오른쪽
        slide.addText(section.rightTitle || '', {
          x: 7, y: 1.3, w: 5.5, h: 0.5,
          fontSize: 18, fontFace: 'Pretendard,맑은 고딕',
          color: theme.secondary, bold: true
        });
        const rightBullets = (section.rightItems || []).map(item => ({
          text: item,
          options: {
            fontSize: 14, fontFace: 'Pretendard,맑은 고딕',
            color: theme.text, bullet: { code: '25CF', color: theme.primary },
            spacing: { before: 6, after: 6 }
          }
        }));
        slide.addText(rightBullets, {
          x: 7, y: 1.9, w: 5.5, h: 4.5, valign: 'top'
        });

        // 구분선
        slide.addShape(pptx.ShapeType.rect, {
          x: 6.5, y: 1.3, w: 0.02, h: 5, fill: { color: theme.accent }
        });
      } else if (section.type === 'cards') {
        const cards = section.cards || [];
        const maxCols = Math.min(cards.length, 4);
        const cardWidth = (11.5 - (maxCols - 1) * 0.3) / maxCols;

        cards.slice(0, 4).forEach((card, i) => {
          const x = 0.8 + i * (cardWidth + 0.3);
          // 카드 배경
          slide.addShape(pptx.ShapeType.roundRect, {
            x, y: 1.5, w: cardWidth, h: 4.5,
            fill: { color: 'FFFFFF' },
            shadow: { type: 'outer', blur: 10, offset: 3, color: '000000', opacity: 0.15 },
            rectRadius: 0.1
          });
          // 카드 상단 색상바
          slide.addShape(pptx.ShapeType.rect, {
            x: x + 0.05, y: 1.55, w: cardWidth - 0.1, h: 0.06,
            fill: { color: theme.primary }
          });
          // 카드 제목
          slide.addText(card.title || '', {
            x, y: 1.8, w: cardWidth, h: 0.6,
            fontSize: maxCols >= 4 ? 16 : 20, fontFace: 'Pretendard,맑은 고딕',
            color: theme.primary, bold: true, align: 'center'
          });
          // 카드 내용
          slide.addText(card.body || '', {
            x: x + 0.2, y: 2.5, w: cardWidth - 0.4, h: 3.2,
            fontSize: maxCols >= 4 ? 13 : 16, fontFace: 'Pretendard,맑은 고딕',
            color: theme.text, valign: 'top'
          });
        });
      } else if (section.type === 'steps') {
        const steps = section.steps || [];
        const stepHeight = Math.min(1.2, 5 / steps.length);

        steps.forEach((step, i) => {
          const y = 1.4 + i * stepHeight;
          // 숫자 원
          slide.addShape(pptx.ShapeType.ellipse, {
            x: 0.8, y, w: 0.6, h: 0.6,
            fill: { color: theme.primary }
          });
          slide.addText(String(i + 1), {
            x: 0.8, y, w: 0.6, h: 0.6,
            fontSize: 16, fontFace: 'Pretendard,맑은 고딕',
            color: 'FFFFFF', bold: true, align: 'center', valign: 'middle'
          });
          // 연결선
          if (i < steps.length - 1) {
            slide.addShape(pptx.ShapeType.rect, {
              x: 1.07, y: y + 0.6, w: 0.06, h: stepHeight - 0.6,
              fill: { color: theme.accent }
            });
          }
          // 텍스트
          slide.addText(step.title || step, {
            x: 1.7, y, w: 10.5, h: 0.35,
            fontSize: 20, fontFace: 'Pretendard,맑은 고딕',
            color: theme.text, bold: true
          });
          if (step.desc) {
            slide.addText(step.desc, {
              x: 1.7, y: y + 0.32, w: 10.5, h: 0.3,
              fontSize: 15, fontFace: 'Pretendard,맑은 고딕',
              color: theme.lightText
            });
          }
        });
      } else if (section.type === 'stats') {
        const stats = section.stats || [];
        const statWidth = (11.5 - (stats.length - 1) * 0.3) / stats.length;

        stats.forEach((stat, i) => {
          const x = 0.8 + i * (statWidth + 0.3);
          // 카드 배경
          slide.addShape(pptx.ShapeType.roundRect, {
            x, y: 2.0, w: statWidth, h: 3.5,
            fill: { color: 'FFFFFF' },
            shadow: { type: 'outer', blur: 10, offset: 3, color: '000000', opacity: 0.15 },
            rectRadius: 0.1
          });
          // 숫자
          slide.addText(String(stat.value) + (stat.suffix || ''), {
            x, y: 2.3, w: statWidth, h: 1.5,
            fontSize: 52, fontFace: 'Pretendard,맑은 고딕',
            color: theme.primary, bold: true, align: 'center'
          });
          // 라벨
          slide.addText(stat.label || '', {
            x, y: 4.0, w: statWidth, h: 0.8,
            fontSize: 14, fontFace: 'Pretendard,맑은 고딕',
            color: theme.text, align: 'center'
          });
        });
      } else if (section.type === 'timeline') {
        const events = section.events || [];
        const evW = Math.min(2.2, 11.5 / events.length);
        // 연결선
        slide.addShape(pptx.ShapeType.rect, {
          x: 1.5, y: 3.2, w: 10, h: 0.04, fill: { color: theme.accent }
        });
        events.forEach((ev, i) => {
          const x = 0.8 + i * evW + (11.5 - events.length * evW) / 2;
          // 점
          slide.addShape(pptx.ShapeType.ellipse, {
            x: x + evW / 2 - 0.15, y: 3.05, w: 0.3, h: 0.3,
            fill: { color: theme.primary }
          });
          // 연도
          slide.addText(ev.year || ev.label || '', {
            x, y: 2.0, w: evW, h: 0.8,
            fontSize: 16, fontFace: 'Pretendard,맑은 고딕',
            color: theme.primary, bold: true, align: 'center'
          });
          // 설명
          slide.addText(ev.desc || ev.text || '', {
            x, y: 3.6, w: evW, h: 2.5,
            fontSize: 12, fontFace: 'Pretendard,맑은 고딕',
            color: theme.text, align: 'center', valign: 'top'
          });
        });
      } else if (section.type === 'checklist') {
        const items = section.items || [];
        const rowH = Math.min(0.7, 5.5 / items.length);
        items.forEach((item, i) => {
          const isObj = typeof item === 'object';
          const text = isObj ? item.text : item;
          const done = isObj ? item.done !== false : true;
          const y = 1.3 + i * rowH;
          // 체크 아이콘
          slide.addShape(pptx.ShapeType.ellipse, {
            x: 0.8, y, w: 0.4, h: 0.4,
            fill: { color: done ? '22C55E' : 'CCCCCC' }
          });
          if (done) {
            slide.addText('✓', {
              x: 0.8, y, w: 0.4, h: 0.4,
              fontSize: 14, color: 'FFFFFF', align: 'center', valign: 'middle'
            });
          }
          slide.addText(text, {
            x: 1.4, y, w: 10.5, h: 0.4,
            fontSize: 18, fontFace: 'Pretendard,맑은 고딕',
            color: theme.text
          });
        });
      } else if (section.type === 'quote') {
        slide.addText('"', {
          x: 2, y: 1.2, w: 2, h: 1.5,
          fontSize: 100, fontFace: 'Georgia',
          color: theme.primary, transparency: 40
        });
        slide.addText(section.quote || section.body || '', {
          x: 2, y: 2.5, w: 9, h: 2.5,
          fontSize: 24, fontFace: 'Pretendard,맑은 고딕',
          color: theme.text, italic: true, align: 'center', valign: 'middle'
        });
        if (section.author) {
          slide.addText('— ' + section.author, {
            x: 2, y: 5.2, w: 9, h: 0.6,
            fontSize: 16, fontFace: 'Pretendard,맑은 고딕',
            color: theme.lightText, align: 'center'
          });
        }
      } else if (section.type === 'progress') {
        const items = section.items || [];
        const rowH = Math.min(1.2, 5.5 / items.length);
        items.forEach((item, i) => {
          const y = 1.3 + i * rowH;
          // 라벨
          slide.addText(item.label, {
            x: 0.8, y, w: 8, h: 0.4,
            fontSize: 16, fontFace: 'Pretendard,맑은 고딕',
            color: theme.text, bold: true
          });
          // 값
          slide.addText(String(item.value) + (item.suffix || '%'), {
            x: 9, y, w: 3, h: 0.4,
            fontSize: 16, fontFace: 'Pretendard,맑은 고딕',
            color: theme.primary, bold: true, align: 'right'
          });
          // 바 배경
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8, y: y + 0.5, w: 11.5, h: 0.3,
            fill: { color: 'E2E8F0' }, rectRadius: 0.05
          });
          // 바 채움
          const fillW = Math.max(0.1, (11.5 * Math.min(item.value, 100)) / 100);
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8, y: y + 0.5, w: fillW, h: 0.3,
            fill: { color: theme.primary }, rectRadius: 0.05
          });
        });
      } else if (section.type === 'pyramid') {
        const levels = section.levels || [];
        const levelH = Math.min(1.2, 5.5 / levels.length);
        levels.forEach((lv, i) => {
          const y = 1.3 + i * levelH;
          const indent = i * 0.8;
          const w = 11.5 - indent * 2;
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8 + indent, y, w, h: levelH - 0.15,
            fill: { color: theme.primary },
            transparency: 20 + i * 12,
            rectRadius: 0.08
          });
          slide.addText(typeof lv === 'string' ? lv : lv.title, {
            x: 0.8 + indent, y, w, h: lv.desc ? (levelH - 0.15) * 0.55 : levelH - 0.15,
            fontSize: 18, fontFace: 'Pretendard,맑은 고딕',
            color: 'FFFFFF', bold: true, align: 'center', valign: lv.desc ? 'bottom' : 'middle'
          });
          if (lv.desc) {
            slide.addText(lv.desc, {
              x: 0.8 + indent, y: y + (levelH - 0.15) * 0.5, w, h: (levelH - 0.15) * 0.45,
              fontSize: 13, fontFace: 'Pretendard,맑은 고딕',
              color: 'FFFFFF', transparency: 30, align: 'center', valign: 'top'
            });
          }
        });
      } else if (section.type === 'icon-grid') {
        const items = section.items || [];
        const cols = Math.min(items.length, 3);
        const rows = Math.ceil(items.length / cols);
        const cellW = (11.5 - (cols - 1) * 0.3) / cols;
        const cellH = Math.min(2.5, 5.5 / rows);
        items.forEach((item, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = 0.8 + col * (cellW + 0.3);
          const y = 1.3 + row * cellH;
          // 배경
          slide.addShape(pptx.ShapeType.roundRect, {
            x, y, w: cellW, h: cellH - 0.15,
            fill: { color: 'FFFFFF' },
            shadow: { type: 'outer', blur: 8, offset: 2, color: '000000', opacity: 0.1 },
            rectRadius: 0.08
          });
          // 아이콘 영역
          slide.addShape(pptx.ShapeType.roundRect, {
            x: x + cellW / 2 - 0.3, y: y + 0.2, w: 0.6, h: 0.6,
            fill: { color: theme.primary }, rectRadius: 0.1
          });
          // 제목
          slide.addText(item.title || '', {
            x, y: y + 1.0, w: cellW, h: 0.4,
            fontSize: 16, fontFace: 'Pretendard,맑은 고딕',
            color: theme.text, bold: true, align: 'center'
          });
          // 설명
          if (item.desc) {
            slide.addText(item.desc, {
              x: x + 0.15, y: y + 1.4, w: cellW - 0.3, h: cellH - 1.7,
              fontSize: 12, fontFace: 'Pretendard,맑은 고딕',
              color: theme.lightText, align: 'center', valign: 'top'
            });
          }
        });
      } else {
        // 기본 텍스트
        slide.addText(section.body || '', {
          x: 0.8, y: 1.3, w: 11.5, h: 5.5,
          fontSize: 16, fontFace: 'Pretendard,맑은 고딕',
          color: theme.text, valign: 'top',
          lineSpacing: 28
        });
      }

      slideNum++;

      // 페이지 번호
      slide.addText(String(slideNum), {
        x: 12, y: 7, w: 1, h: 0.4,
        fontSize: 10, color: theme.lightText, align: 'right'
      });
    }
  }

  // 마무리 슬라이드
  if (slides.ending) {
    const endSlide = pptx.addSlide();
    endSlide.background = { fill: theme.primary };

    endSlide.addText(slides.ending.title || '감사합니다', {
      x: 0.8, y: 2.0, w: 11.5, h: 1.5,
      fontSize: 44, fontFace: 'Pretendard,맑은 고딕',
      color: 'FFFFFF', bold: true, align: 'center'
    });

    if (slides.ending.subtitle) {
      endSlide.addText(slides.ending.subtitle, {
        x: 0.8, y: 3.8, w: 11.5, h: 0.8,
        fontSize: 18, fontFace: 'Pretendard,맑은 고딕',
        color: 'FFFFFF', align: 'center', transparency: 30
      });
    }
  }

  const outputPath = `output/pptx/${filename}`;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await pptx.writeFile({ fileName: outputPath });
  return outputPath;
}

module.exports = { generate, THEMES };
