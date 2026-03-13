const PptxGenJS = require('pptxgenjs');
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
      fontSize: 40, fontFace: 'Pretendard,맑은 고딕',
      color: 'FFFFFF', bold: true, align: 'left'
    });

    if (slides.cover.subtitle) {
      coverSlide.addText(slides.cover.subtitle, {
        x: 0.8, y: 3.2, w: 11.5, h: 0.8,
        fontSize: 20, fontFace: 'Pretendard,맑은 고딕',
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
          fontSize: 36, fontFace: 'Pretendard,맑은 고딕',
          color: 'FFFFFF', bold: true
        });

        if (section.description) {
          sectionSlide.addText(section.description, {
            x: 0.8, y: 3.5, w: 11.5, h: 0.8,
            fontSize: 16, fontFace: 'Pretendard,맑은 고딕',
            color: 'FFFFFF', transparency: 30
          });
        }
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
        fontSize: 26, fontFace: 'Pretendard,맑은 고딕',
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
            fontSize: 16, fontFace: 'Pretendard,맑은 고딕',
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
        const cols = Math.min(cards.length, 3);
        const cardWidth = (11.5 - (cols - 1) * 0.3) / cols;

        cards.forEach((card, i) => {
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
            fontSize: 16, fontFace: 'Pretendard,맑은 고딕',
            color: theme.primary, bold: true, align: 'center'
          });
          // 카드 내용
          slide.addText(card.body || '', {
            x: x + 0.2, y: 2.5, w: cardWidth - 0.4, h: 3.2,
            fontSize: 13, fontFace: 'Pretendard,맑은 고딕',
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
            fontSize: 16, fontFace: 'Pretendard,맑은 고딕',
            color: theme.text, bold: true
          });
          if (step.desc) {
            slide.addText(step.desc, {
              x: 1.7, y: y + 0.32, w: 10.5, h: 0.3,
              fontSize: 12, fontFace: 'Pretendard,맑은 고딕',
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
            fontSize: 40, fontFace: 'Pretendard,맑은 고딕',
            color: theme.primary, bold: true, align: 'center'
          });
          // 라벨
          slide.addText(stat.label || '', {
            x, y: 4.0, w: statWidth, h: 0.8,
            fontSize: 14, fontFace: 'Pretendard,맑은 고딕',
            color: theme.text, align: 'center'
          });
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

      // 페이지 번호
      slide.addText(String(slides.content.indexOf(section) + 1), {
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
  await pptx.writeFile({ fileName: outputPath });
  return outputPath;
}

module.exports = { generate, THEMES };
