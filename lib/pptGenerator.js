const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

// #7 폰트 fallback 개선
const FONT = 'Pretendard,맑은 고딕,Malgun Gothic,Apple SD Gothic Neo,sans-serif';

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
  },
  nature: {
    name: '자연 그린',
    primary: '16A34A',
    secondary: '15803D',
    accent: '4ADE80',
    bg: 'F0FDF4',
    text: '14532D',
    lightText: '6B7280',
    gradient: ['16A34A', '0D9488']
  },
  tech: {
    name: '테크 사이버',
    primary: '06B6D4',
    secondary: '0E7490',
    accent: '22D3EE',
    bg: '0F172A',
    text: 'E2E8F0',
    lightText: '94A3B8',
    gradient: ['06B6D4', '10B981']
  },
  elegant: {
    name: '엘레강스',
    primary: 'D4A017',
    secondary: 'B8860B',
    accent: 'F5D060',
    bg: '1A1A1A',
    text: 'F5F5F5',
    lightText: 'A3A3A3',
    gradient: ['D4A017', 'B8860B']
  },
  creative: {
    name: '크리에이티브',
    primary: 'D946EF',
    secondary: 'A855F7',
    accent: 'F0ABFC',
    bg: 'FDF4FF',
    text: '3B0764',
    lightText: '7E22CE',
    gradient: ['EC4899', 'A855F7']
  },
  minimal: {
    name: '미니멀',
    primary: '262626',
    secondary: '404040',
    accent: '737373',
    bg: 'FFFFFF',
    text: '171717',
    lightText: '9CA3AF',
    gradient: ['262626', '525252']
  }
};

// ============================================================
// #5 슬라이드 빌더 헬퍼 함수
// ============================================================

/** 제목 + 구분선 */
function addTitle(slide, text, theme, pptx) {
  slide.addText(text, {
    x: 0.8, y: 0.3, w: 11.5, h: 0.7,
    fontSize: 32, fontFace: FONT,
    color: theme.primary, bold: true
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 1.0, w: 1.5, h: 0.03, fill: { color: theme.accent }
  });
}

/** 상단 컬러 바 */
function addTopBar(slide, theme, pptx) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: theme.primary }
  });
}

/** 페이지 번호 */
function addPageNumber(slide, num, theme) {
  slide.addText(String(num), {
    x: 12, y: 7, w: 1, h: 0.4,
    fontSize: 10, color: theme.lightText, align: 'right'
  });
}

/** 카드 배경 + 그림자 */
function addCardBg(slide, x, y, w, h, theme, pptx) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: 'FFFFFF' },
    shadow: { type: 'outer', blur: 10, offset: 3, color: '000000', opacity: 0.15 },
    rectRadius: 0.1
  });
}

// #6 그라데이션 배경 적용 헬퍼
function applyGradientBg(slide, theme, pptx) {
  slide.background = {
    fill: {
      type: 'solid',
      color: theme.primary
    }
  };
  // PptxGenJS gradient via multiple shapes overlay
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 7.5,
    fill: { color: theme.gradient[0] }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 6.66, y: 0, w: 6.67, h: 7.5,
    fill: { color: theme.gradient[1] },
    transparency: 30
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 3.75, w: 13.33, h: 3.75,
    fill: { color: theme.gradient[1] },
    transparency: 50
  });
}

async function generate(slides, themeName = 'modern', filename = 'presentation.pptx') {
  const theme = THEMES[themeName] || THEMES.modern;
  const pptx = new PptxGenJS();

  pptx.layout = 'LAYOUT_WIDE'; // 16:9
  pptx.author = 'AI 교육 발표자료 생성기';

  // 전체 섹션 수 계산 (진행률 표시용)
  const totalSections = slides.content ? slides.content.filter(s => s.isSection).length : 0;
  let sectionIndex = 0;

  // ========== 표지 슬라이드 ==========
  if (slides.cover) {
    const coverSlide = pptx.addSlide();

    // #6 그라데이션 배경
    applyGradientBg(coverSlide, theme, pptx);

    coverSlide.addText(slides.cover.title, {
      x: 0.8, y: 1.5, w: 8.5, h: 1.5,
      fontSize: 48, fontFace: FONT,
      color: 'FFFFFF', bold: true, align: 'left'
    });

    if (slides.cover.subtitle) {
      coverSlide.addText(slides.cover.subtitle, {
        x: 0.8, y: 3.2, w: 8.5, h: 0.8,
        fontSize: 24, fontFace: FONT,
        color: 'FFFFFF', align: 'left', transparency: 30
      });
    }

    if (slides.cover.presenter) {
      coverSlide.addText(slides.cover.presenter, {
        x: 0.8, y: 4.5, w: 8.5, h: 0.5,
        fontSize: 16, fontFace: FONT,
        color: 'FFFFFF', align: 'left', transparency: 40
      });
    }

    // 날짜 자동 표시
    const coverDate = slides.cover.date || new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    coverSlide.addText(coverDate, {
      x: 0.8, y: 5.2, w: 8.5, h: 0.5,
      fontSize: 14, fontFace: FONT,
      color: 'FFFFFF', align: 'left', transparency: 50
    });

    // 로고 영역 (우측 상단)
    if (slides.cover.logoPath) {
      try {
        const logoFullPath = path.resolve(slides.cover.logoPath);
        if (fs.existsSync(logoFullPath)) {
          coverSlide.addImage({
            path: logoFullPath,
            x: 10.5, y: 0.4, w: 2, h: 1,
            sizing: { type: 'contain', w: 2, h: 1 }
          });
        }
      } catch (e) { /* 로고 파일 없으면 무시 */ }
    } else if (slides.cover.logoText) {
      coverSlide.addText(slides.cover.logoText, {
        x: 10, y: 0.4, w: 2.5, h: 0.6,
        fontSize: 14, fontFace: FONT,
        color: 'FFFFFF', align: 'right', transparency: 30
      });
    }

    // 장식 라인
    coverSlide.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: 3.0, w: 3, h: 0.05, fill: { color: 'FFFFFF' }
    });

    // #1 오른쪽 장식 도형 (큰 반투명 원 3개)
    coverSlide.addShape(pptx.ShapeType.ellipse, {
      x: 9.0, y: 0.5, w: 4.5, h: 4.5,
      fill: { color: 'FFFFFF' }, transparency: 92
    });
    coverSlide.addShape(pptx.ShapeType.ellipse, {
      x: 10.5, y: 3.0, w: 3.5, h: 3.5,
      fill: { color: 'FFFFFF' }, transparency: 88
    });
    coverSlide.addShape(pptx.ShapeType.ellipse, {
      x: 8.0, y: 4.5, w: 2.5, h: 2.5,
      fill: { color: 'FFFFFF' }, transparency: 94
    });

    // #1 하단 얇은 구분선
    coverSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 7.1, w: 13.33, h: 0.03, fill: { color: 'FFFFFF' }, transparency: 50
    });
  }

  // ========== 목차 슬라이드 ==========
  if (slides.toc && slides.toc.length > 0) {
    const tocSlide = pptx.addSlide();
    tocSlide.background = { fill: theme.bg };

    tocSlide.addText('목차', {
      x: 0.8, y: 0.4, w: 5, h: 0.8,
      fontSize: 32, fontFace: FONT,
      color: theme.primary, bold: true
    });

    tocSlide.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: 1.1, w: 2, h: 0.04, fill: { color: theme.primary }
    });

    slides.toc.forEach((item, i) => {
      tocSlide.addText(`${String(i + 1).padStart(2, '0')}`, {
        x: 0.8, y: 1.6 + i * 0.7, w: 0.8, h: 0.5,
        fontSize: 24, fontFace: FONT,
        color: theme.primary, bold: true
      });
      tocSlide.addText(item, {
        x: 1.7, y: 1.6 + i * 0.7, w: 10, h: 0.5,
        fontSize: 18, fontFace: FONT,
        color: theme.text
      });
    });
  }

  // ========== 내용 슬라이드들 ==========
  if (slides.content && slides.content.length > 0) {
    let slideNum = 0;

    for (const section of slides.content) {
      // 섹션 구분 슬라이드
      if (section.isSection) {
        sectionIndex++;
        const sectionSlide = pptx.addSlide();

        // #6 그라데이션 배경
        applyGradientBg(sectionSlide, theme, pptx);

        // #2 배경에 큰 반투명 숫자
        sectionSlide.addText(section.sectionNumber || String(sectionIndex), {
          x: 5, y: 0.5, w: 5, h: 6,
          fontSize: 200, fontFace: FONT,
          color: 'FFFFFF', bold: true, transparency: 90, align: 'right', valign: 'middle'
        });

        sectionSlide.addText(section.sectionNumber || '', {
          x: 0.8, y: 1.0, w: 2, h: 1,
          fontSize: 60, fontFace: FONT,
          color: 'FFFFFF', bold: true, transparency: 30
        });

        sectionSlide.addText(section.title, {
          x: 0.8, y: 2.2, w: 11.5, h: 1.2,
          fontSize: 44, fontFace: FONT,
          color: 'FFFFFF', bold: true
        });

        if (section.description) {
          sectionSlide.addText(section.description, {
            x: 0.8, y: 3.5, w: 11.5, h: 0.8,
            fontSize: 16, fontFace: FONT,
            color: 'FFFFFF', transparency: 30
          });
        }

        // #2 하단 진행률 표시
        if (totalSections > 0) {
          const progressText = `${sectionIndex} / ${totalSections}`;
          sectionSlide.addText(progressText, {
            x: 10.5, y: 6.6, w: 2, h: 0.5,
            fontSize: 14, fontFace: FONT,
            color: 'FFFFFF', transparency: 40, align: 'right'
          });
          // 진행률 바 배경
          sectionSlide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8, y: 6.8, w: 9.5, h: 0.12,
            fill: { color: 'FFFFFF' }, transparency: 80, rectRadius: 0.03
          });
          // 진행률 바 채움
          const progressW = (9.5 * sectionIndex) / totalSections;
          sectionSlide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8, y: 6.8, w: progressW, h: 0.12,
            fill: { color: 'FFFFFF' }, transparency: 40, rectRadius: 0.03
          });
        }

        // 스피커 노트
        if (section.notes) {
          sectionSlide.addNotes(section.notes);
        }
        slideNum++;
        continue;
      }

      const slide = pptx.addSlide();
      slide.background = { fill: theme.bg };

      // #5 헬퍼 사용
      addTopBar(slide, theme, pptx);
      addTitle(slide, section.title, theme, pptx);

      // 내용 타입별 처리
      if (section.type === 'bullets') {
        const bullets = (section.items || []).map(item => ({
          text: item,
          options: {
            fontSize: 20, fontFace: FONT,
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
          fontSize: 18, fontFace: FONT,
          color: theme.secondary, bold: true
        });
        const leftBullets = (section.leftItems || []).map(item => ({
          text: item,
          options: {
            fontSize: 14, fontFace: FONT,
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
          fontSize: 18, fontFace: FONT,
          color: theme.secondary, bold: true
        });
        const rightBullets = (section.rightItems || []).map(item => ({
          text: item,
          options: {
            fontSize: 14, fontFace: FONT,
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
          // #5 카드 배경 헬퍼
          addCardBg(slide, x, 1.5, cardWidth, 4.5, theme, pptx);
          // 카드 상단 색상바
          slide.addShape(pptx.ShapeType.rect, {
            x: x + 0.05, y: 1.55, w: cardWidth - 0.1, h: 0.06,
            fill: { color: theme.primary }
          });

          // #3 카드 상단 숫자 원형 배지
          slide.addShape(pptx.ShapeType.ellipse, {
            x: x + cardWidth / 2 - 0.3, y: 1.75, w: 0.6, h: 0.6,
            fill: { color: theme.primary }
          });
          slide.addText(String(i + 1), {
            x: x + cardWidth / 2 - 0.3, y: 1.75, w: 0.6, h: 0.6,
            fontSize: 18, fontFace: FONT,
            color: 'FFFFFF', bold: true, align: 'center', valign: 'middle'
          });

          // 카드 제목
          slide.addText(card.title || '', {
            x, y: 2.5, w: cardWidth, h: 0.5,
            fontSize: maxCols >= 4 ? 16 : 20, fontFace: FONT,
            color: theme.primary, bold: true, align: 'center'
          });
          // 카드 내용
          slide.addText(card.body || '', {
            x: x + 0.2, y: 3.1, w: cardWidth - 0.4, h: 2.7,
            fontSize: maxCols >= 4 ? 13 : 16, fontFace: FONT,
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
            fontSize: 16, fontFace: FONT,
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
            fontSize: 20, fontFace: FONT,
            color: theme.text, bold: true
          });
          if (step.desc) {
            slide.addText(step.desc, {
              x: 1.7, y: y + 0.32, w: 10.5, h: 0.3,
              fontSize: 15, fontFace: FONT,
              color: theme.lightText
            });
          }
        });
      } else if (section.type === 'stats') {
        const stats = section.stats || [];
        const statWidth = (11.5 - (stats.length - 1) * 0.3) / stats.length;

        stats.forEach((stat, i) => {
          const x = 0.8 + i * (statWidth + 0.3);
          // #5 카드 배경 헬퍼
          addCardBg(slide, x, 2.0, statWidth, 3.5, theme, pptx);
          // 숫자
          slide.addText(String(stat.value) + (stat.suffix || ''), {
            x, y: 2.3, w: statWidth, h: 1.5,
            fontSize: 52, fontFace: FONT,
            color: theme.primary, bold: true, align: 'center'
          });
          // 라벨
          slide.addText(stat.label || '', {
            x, y: 4.0, w: statWidth, h: 0.8,
            fontSize: 14, fontFace: FONT,
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
            fontSize: 16, fontFace: FONT,
            color: theme.primary, bold: true, align: 'center'
          });
          // 설명
          slide.addText(ev.desc || ev.text || '', {
            x, y: 3.6, w: evW, h: 2.5,
            fontSize: 12, fontFace: FONT,
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
            slide.addText('\u2713', {
              x: 0.8, y, w: 0.4, h: 0.4,
              fontSize: 14, color: 'FFFFFF', align: 'center', valign: 'middle'
            });
          }
          slide.addText(text, {
            x: 1.4, y, w: 10.5, h: 0.4,
            fontSize: 18, fontFace: FONT,
            color: theme.text
          });
        });
      } else if (section.type === 'quote') {
        slide.addText('\u201C', {
          x: 2, y: 1.2, w: 2, h: 1.5,
          fontSize: 100, fontFace: 'Georgia',
          color: theme.primary, transparency: 40
        });
        slide.addText(section.quote || section.body || '', {
          x: 2, y: 2.5, w: 9, h: 2.5,
          fontSize: 24, fontFace: FONT,
          color: theme.text, italic: true, align: 'center', valign: 'middle'
        });
        if (section.author) {
          slide.addText('\u2014 ' + section.author, {
            x: 2, y: 5.2, w: 9, h: 0.6,
            fontSize: 16, fontFace: FONT,
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
            fontSize: 16, fontFace: FONT,
            color: theme.text, bold: true
          });
          // 값
          slide.addText(String(item.value) + (item.suffix || '%'), {
            x: 9, y, w: 3, h: 0.4,
            fontSize: 16, fontFace: FONT,
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
            fontSize: 18, fontFace: FONT,
            color: 'FFFFFF', bold: true, align: 'center', valign: lv.desc ? 'bottom' : 'middle'
          });
          if (lv.desc) {
            slide.addText(lv.desc, {
              x: 0.8 + indent, y: y + (levelH - 0.15) * 0.5, w, h: (levelH - 0.15) * 0.45,
              fontSize: 13, fontFace: FONT,
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
            fontSize: 16, fontFace: FONT,
            color: theme.text, bold: true, align: 'center'
          });
          // 설명
          if (item.desc) {
            slide.addText(item.desc, {
              x: x + 0.15, y: y + 1.4, w: cellW - 0.3, h: cellH - 1.7,
              fontSize: 12, fontFace: FONT,
              color: theme.lightText, align: 'center', valign: 'top'
            });
          }
        });
      } else if (section.type === 'donut') {
        const items = section.items || [];
        const cols = Math.min(items.length, 4);
        const colW = (11.5 - (cols - 1) * 0.5) / cols;
        items.slice(0, 4).forEach((item, i) => {
          const x = 0.8 + i * (colW + 0.5);
          slide.addShape(pptx.ShapeType.ellipse, {
            x: x + colW / 2 - 0.8, y: 1.8, w: 1.6, h: 1.6,
            fill: { color: 'FFFFFF' },
            line: { color: theme.primary, width: 4 }
          });
          slide.addText(String(item.value) + (item.suffix || '%'), {
            x: x + colW / 2 - 0.8, y: 1.8, w: 1.6, h: 1.6,
            fontSize: 24, fontFace: FONT,
            color: theme.primary, bold: true, align: 'center', valign: 'middle'
          });
          slide.addText(item.label || '', {
            x, y: 3.8, w: colW, h: 0.6,
            fontSize: 14, fontFace: FONT,
            color: theme.text, align: 'center'
          });
        });
      } else if (section.type === 'matrix') {
        const cells = section.cells || [];
        const positions = [[0.8, 1.3, 5.5, 2.7], [6.7, 1.3, 5.5, 2.7], [0.8, 4.2, 5.5, 2.7], [6.7, 4.2, 5.5, 2.7]];
        cells.slice(0, 4).forEach((c, i) => {
          const [x, y, w, h] = positions[i];
          slide.addShape(pptx.ShapeType.roundRect, {
            x, y, w, h, fill: { color: 'FFFFFF' },
            shadow: { type: 'outer', blur: 8, offset: 2, color: '000000', opacity: 0.1 },
            rectRadius: 0.08
          });
          slide.addText(c.title || '', {
            x: x + 0.2, y: y + 0.15, w: w - 0.4, h: 0.5,
            fontSize: 18, fontFace: FONT,
            color: theme.primary, bold: true
          });
          slide.addText(c.body || '', {
            x: x + 0.2, y: y + 0.7, w: w - 0.4, h: h - 0.9,
            fontSize: 13, fontFace: FONT,
            color: theme.text, valign: 'top'
          });
        });
      } else if (section.type === 'cycle') {
        const nodes = section.nodes || [];
        const n = nodes.length;
        const cx = 6.66, cy = 3.8, r = 2.2;
        nodes.forEach((nd, i) => {
          const angle = (2 * Math.PI * i / n) - Math.PI / 2;
          const x = cx + r * Math.cos(angle) - 1;
          const y = cy + r * Math.sin(angle) - 0.4;
          slide.addShape(pptx.ShapeType.roundRect, {
            x, y, w: 2, h: 0.8, fill: { color: theme.primary },
            rectRadius: 0.08
          });
          slide.addText(typeof nd === 'string' ? nd : nd.title, {
            x, y, w: 2, h: 0.8,
            fontSize: 14, fontFace: FONT,
            color: 'FFFFFF', bold: true, align: 'center', valign: 'middle'
          });
        });
      } else if (section.type === 'process-arrow') {
        const steps = section.steps || [];
        const stepW = 11.5 / steps.length;
        steps.forEach((st, i) => {
          const x = 0.8 + i * stepW;
          slide.addShape(pptx.ShapeType.rect, {
            x, y: 2.5, w: stepW - 0.1, h: 2.5,
            fill: { color: theme.primary },
            transparency: 10 + i * 10
          });
          slide.addText(typeof st === 'string' ? st : st.title, {
            x, y: 2.8, w: stepW - 0.1, h: 0.6,
            fontSize: 16, fontFace: FONT,
            color: 'FFFFFF', bold: true, align: 'center'
          });
          if (st.desc) {
            slide.addText(st.desc, {
              x, y: 3.5, w: stepW - 0.1, h: 1.2,
              fontSize: 12, fontFace: FONT,
              color: 'FFFFFF', transparency: 30, align: 'center', valign: 'top'
            });
          }
          if (i < steps.length - 1) {
            slide.addText('\u25B6', {
              x: x + stepW - 0.3, y: 3.3, w: 0.5, h: 0.5,
              fontSize: 16, color: 'FFFFFF', align: 'center', valign: 'middle'
            });
          }
        });
      } else if (section.type === 'bar-chart') {
        const items = section.items || [];
        const maxVal = Math.max(...items.map(it => it.value), 1);
        const barW = Math.min(1.5, 11 / items.length);
        const maxH = 4.5;
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.8, y: 6.3, w: 11.5, h: 0.03, fill: { color: theme.lightText }
        });
        items.forEach((item, i) => {
          const x = 0.8 + (11.5 - items.length * barW) / 2 + i * barW;
          const h = Math.max(0.2, (item.value / maxVal) * maxH);
          slide.addShape(pptx.ShapeType.roundRect, {
            x: x + 0.1, y: 6.3 - h, w: barW - 0.2, h,
            fill: { color: theme.primary }, rectRadius: 0.05
          });
          slide.addText(String(item.value) + (item.suffix || ''), {
            x: x + 0.1, y: 6.3 - h - 0.4, w: barW - 0.2, h: 0.4,
            fontSize: 12, fontFace: FONT,
            color: theme.primary, bold: true, align: 'center'
          });
          slide.addText(item.label || '', {
            x: x + 0.1, y: 6.4, w: barW - 0.2, h: 0.4,
            fontSize: 11, fontFace: FONT,
            color: theme.lightText, align: 'center'
          });
        });
      } else if (section.type === 'highlight') {
        slide.background = { fill: theme.primary };
        slide.addText(section.body || section.message || '', {
          x: 1.5, y: 2.0, w: 10, h: 2.5,
          fontSize: 36, fontFace: FONT,
          color: 'FFFFFF', bold: true, align: 'center', valign: 'middle'
        });
        if (section.sub) {
          slide.addText(section.sub, {
            x: 1.5, y: 4.8, w: 10, h: 0.8,
            fontSize: 18, fontFace: FONT,
            color: 'FFFFFF', transparency: 40, align: 'center'
          });
        }
      } else if (section.type === 'swot') {
        const swotData = [
          { label: 'S', title: 'Strengths', items: section.strengths || [], color: '22C55E' },
          { label: 'W', title: 'Weaknesses', items: section.weaknesses || [], color: 'EAB308' },
          { label: 'O', title: 'Opportunities', items: section.opportunities || [], color: 'EF4444' },
          { label: 'T', title: 'Threats', items: section.threats || [], color: '3B82F6' }
        ];
        const pos = [[0.8, 1.3], [6.7, 1.3], [0.8, 4.2], [6.7, 4.2]];
        swotData.forEach((sw, i) => {
          const [x, y] = pos[i];
          slide.addShape(pptx.ShapeType.roundRect, {
            x, y, w: 5.5, h: 2.7, fill: { color: 'FFFFFF' },
            line: { color: sw.color, width: 2 }, rectRadius: 0.08
          });
          slide.addText(sw.title, {
            x: x + 0.2, y: y + 0.1, w: 5, h: 0.5,
            fontSize: 18, fontFace: FONT,
            color: sw.color, bold: true
          });
          const bullets = sw.items.map(it => ({
            text: it, options: { fontSize: 13, fontFace: FONT, color: theme.text, bullet: { code: '25CF', color: sw.color } }
          }));
          if (bullets.length > 0) {
            slide.addText(bullets, {
              x: x + 0.2, y: y + 0.6, w: 5, h: 1.9, valign: 'top'
            });
          }
        });
      } else if (section.type === 'roadmap') {
        const phases = section.phases || [];
        const phW = 11.5 / phases.length;
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.8, y: 3.5, w: 11.5, h: 0.04, fill: { color: theme.accent }
        });
        phases.forEach((ph, i) => {
          const x = 0.8 + i * phW;
          slide.addShape(pptx.ShapeType.ellipse, {
            x: x + phW / 2 - 0.15, y: 3.35, w: 0.3, h: 0.3,
            fill: { color: theme.primary }
          });
          slide.addText(ph.title || '', {
            x, y: 1.5, w: phW, h: 1.5,
            fontSize: 16, fontFace: FONT,
            color: theme.primary, bold: true, align: 'center', valign: 'bottom'
          });
          slide.addText(ph.desc || '', {
            x, y: 3.9, w: phW, h: 1.5,
            fontSize: 12, fontFace: FONT,
            color: theme.text, align: 'center', valign: 'top'
          });
          if (ph.label) {
            slide.addText(ph.label, {
              x, y: 5.5, w: phW, h: 0.4,
              fontSize: 10, fontFace: FONT,
              color: theme.lightText, align: 'center'
            });
          }
        });
      } else if (section.type === 'comparison') {
        const compLeftTitle = section.leftTitle || '\uD56D\uBAA9 A';
        const compRightTitle = section.rightTitle || '\uD56D\uBAA9 B';
        // 왼쪽 영역 배경
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.5, y: 1.3, w: 5.5, h: 5.2,
          fill: { color: 'FFFFFF' },
          shadow: { type: 'outer', blur: 8, offset: 2, color: '000000', opacity: 0.1 },
          rectRadius: 0.1
        });
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.5, y: 1.3, w: 5.5, h: 0.7,
          fill: { color: theme.primary }, rectRadius: 0.1
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.5, y: 1.7, w: 5.5, h: 0.3,
          fill: { color: theme.primary }
        });
        slide.addText(compLeftTitle, {
          x: 0.5, y: 1.3, w: 5.5, h: 0.7,
          fontSize: 20, fontFace: FONT,
          color: 'FFFFFF', bold: true, align: 'center', valign: 'middle'
        });
        const compLeftItems = (section.leftItems || []).map(item => ({
          text: item,
          options: {
            fontSize: 15, fontFace: FONT,
            color: theme.text, bullet: { code: '25CF', color: theme.primary },
            spacing: { before: 6, after: 6 }
          }
        }));
        if (compLeftItems.length > 0) {
          slide.addText(compLeftItems, {
            x: 0.8, y: 2.2, w: 4.9, h: 4.0, valign: 'top'
          });
        }
        // 오른쪽 영역 배경
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 7.3, y: 1.3, w: 5.5, h: 5.2,
          fill: { color: 'FFFFFF' },
          shadow: { type: 'outer', blur: 8, offset: 2, color: '000000', opacity: 0.1 },
          rectRadius: 0.1
        });
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 7.3, y: 1.3, w: 5.5, h: 0.7,
          fill: { color: theme.secondary }, rectRadius: 0.1
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: 7.3, y: 1.7, w: 5.5, h: 0.3,
          fill: { color: theme.secondary }
        });
        slide.addText(compRightTitle, {
          x: 7.3, y: 1.3, w: 5.5, h: 0.7,
          fontSize: 20, fontFace: FONT,
          color: 'FFFFFF', bold: true, align: 'center', valign: 'middle'
        });
        const compRightItems = (section.rightItems || []).map(item => ({
          text: item,
          options: {
            fontSize: 15, fontFace: FONT,
            color: theme.text, bullet: { code: '25CF', color: theme.secondary },
            spacing: { before: 6, after: 6 }
          }
        }));
        if (compRightItems.length > 0) {
          slide.addText(compRightItems, {
            x: 7.6, y: 2.2, w: 4.9, h: 4.0, valign: 'top'
          });
        }
        // 중앙 VS 표시
        slide.addShape(pptx.ShapeType.ellipse, {
          x: 5.9, y: 3.3, w: 1.5, h: 1.5,
          fill: { color: theme.accent },
          shadow: { type: 'outer', blur: 10, offset: 3, color: '000000', opacity: 0.2 }
        });
        slide.addText('VS', {
          x: 5.9, y: 3.3, w: 1.5, h: 1.5,
          fontSize: 28, fontFace: FONT,
          color: 'FFFFFF', bold: true, align: 'center', valign: 'middle'
        });
      } else if (section.type === 'funnel') {
        const funnelStages = section.stages || section.items || [];
        const stageCount = funnelStages.length;
        const stageH = Math.min(1.1, 5.5 / stageCount);
        const maxWidth = 11.0;
        const minWidth = 3.5;

        funnelStages.forEach((stage, i) => {
          const ratio = stageCount > 1 ? i / (stageCount - 1) : 0;
          const w = maxWidth - (maxWidth - minWidth) * ratio;
          const x = 0.8 + (maxWidth - w) / 2;
          const y = 1.3 + i * stageH;
          const alpha = 5 + i * Math.floor(50 / stageCount);

          slide.addShape(pptx.ShapeType.roundRect, {
            x, y, w, h: stageH - 0.08,
            fill: { color: theme.primary },
            transparency: alpha,
            rectRadius: 0.06
          });

          const stageTitle = typeof stage === 'string' ? stage : stage.title;
          const stageValue = typeof stage === 'object' ? stage.value : null;

          slide.addText(stageTitle || '', {
            x, y, w: stageValue ? w * 0.65 : w, h: stageH - 0.08,
            fontSize: Math.max(13, 18 - stageCount), fontFace: FONT,
            color: 'FFFFFF', bold: true, align: 'center', valign: 'middle'
          });

          if (stageValue) {
            slide.addText(String(stageValue) + (stage.suffix || ''), {
              x: x + w * 0.65, y, w: w * 0.35, h: stageH - 0.08,
              fontSize: Math.max(12, 16 - stageCount), fontFace: FONT,
              color: 'FFFFFF', bold: true, align: 'center', valign: 'middle', transparency: 20
            });
          }
        });

      // ========== #8 table 타입 ==========
      } else if (section.type === 'table') {
        const headers = section.headers || [];
        const rows = section.rows || [];
        const colCount = headers.length || (rows[0] ? rows[0].length : 1);
        const colW = 11.5 / colCount;
        const rowH = 0.55;
        const startY = 1.4;

        // 헤더 행 배경
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8, y: startY, w: 11.5, h: rowH,
          fill: { color: theme.primary }, rectRadius: 0.05
        });
        // 헤더 텍스트
        headers.forEach((hdr, ci) => {
          slide.addText(String(hdr), {
            x: 0.8 + ci * colW, y: startY, w: colW, h: rowH,
            fontSize: 14, fontFace: FONT,
            color: 'FFFFFF', bold: true, align: 'center', valign: 'middle'
          });
        });
        // 데이터 행
        rows.forEach((row, ri) => {
          const ry = startY + rowH + ri * rowH;
          // 짝수 행 배경
          if (ri % 2 === 0) {
            slide.addShape(pptx.ShapeType.rect, {
              x: 0.8, y: ry, w: 11.5, h: rowH,
              fill: { color: theme.bg === 'FFFFFF' ? 'F1F5F9' : 'FFFFFF' }, transparency: 50
            });
          }
          // 하단 구분선
          slide.addShape(pptx.ShapeType.rect, {
            x: 0.8, y: ry + rowH - 0.01, w: 11.5, h: 0.01,
            fill: { color: theme.lightText }, transparency: 60
          });
          (row || []).forEach((cell, ci) => {
            slide.addText(String(cell), {
              x: 0.8 + ci * colW, y: ry, w: colW, h: rowH,
              fontSize: 13, fontFace: FONT,
              color: theme.text, align: 'center', valign: 'middle'
            });
          });
        });

      // ========== #9 image-text 타입 ==========
      } else if (section.type === 'image-text') {
        // 왼쪽 이미지 영역 (placeholder 또는 실제 이미지)
        const imgX = 0.8, imgY = 1.4, imgW = 5.5, imgH = 5;

        if (section.imagePath) {
          try {
            const imgFullPath = path.resolve(section.imagePath);
            if (fs.existsSync(imgFullPath)) {
              slide.addImage({
                path: imgFullPath,
                x: imgX, y: imgY, w: imgW, h: imgH,
                sizing: { type: 'contain', w: imgW, h: imgH }
              });
            } else {
              // placeholder
              _addImagePlaceholder(slide, pptx, imgX, imgY, imgW, imgH, theme);
            }
          } catch (e) {
            _addImagePlaceholder(slide, pptx, imgX, imgY, imgW, imgH, theme);
          }
        } else {
          _addImagePlaceholder(slide, pptx, imgX, imgY, imgW, imgH, theme);
        }

        // 오른쪽 텍스트
        if (section.subtitle) {
          slide.addText(section.subtitle, {
            x: 6.8, y: 1.4, w: 5.5, h: 0.5,
            fontSize: 18, fontFace: FONT,
            color: theme.secondary, bold: true
          });
        }
        const bodyText = section.body || '';
        slide.addText(bodyText, {
          x: 6.8, y: section.subtitle ? 2.1 : 1.4, w: 5.5, h: section.subtitle ? 4.3 : 5,
          fontSize: 15, fontFace: FONT,
          color: theme.text, valign: 'top', lineSpacing: 26
        });

      // ========== #10 agenda 타입 ==========
      } else if (section.type === 'agenda') {
        const agendaItems = section.items || [];
        const currentIdx = section.currentIndex != null ? section.currentIndex : -1;
        const itemH = Math.min(0.8, 5.5 / agendaItems.length);

        agendaItems.forEach((item, i) => {
          const y = 1.4 + i * itemH;
          const isCurrent = i === currentIdx;

          // 현재 항목 하이라이트 배경
          if (isCurrent) {
            slide.addShape(pptx.ShapeType.roundRect, {
              x: 0.6, y: y - 0.05, w: 11.9, h: itemH - 0.05,
              fill: { color: theme.primary }, transparency: 88, rectRadius: 0.06
            });
            // 왼쪽 강조 바
            slide.addShape(pptx.ShapeType.rect, {
              x: 0.6, y: y - 0.05, w: 0.08, h: itemH - 0.05,
              fill: { color: theme.primary }
            });
          }

          // 번호
          slide.addShape(pptx.ShapeType.ellipse, {
            x: 0.9, y: y + (itemH - 0.5) / 2 - 0.05, w: 0.5, h: 0.5,
            fill: { color: isCurrent ? theme.primary : 'E2E8F0' }
          });
          slide.addText(String(i + 1), {
            x: 0.9, y: y + (itemH - 0.5) / 2 - 0.05, w: 0.5, h: 0.5,
            fontSize: 14, fontFace: FONT,
            color: isCurrent ? 'FFFFFF' : theme.lightText,
            bold: true, align: 'center', valign: 'middle'
          });

          // 텍스트
          const itemText = typeof item === 'string' ? item : item.title || item.text || '';
          slide.addText(itemText, {
            x: 1.7, y: y, w: 10, h: itemH - 0.1,
            fontSize: isCurrent ? 20 : 18, fontFace: FONT,
            color: isCurrent ? theme.primary : theme.text,
            bold: isCurrent, valign: 'middle'
          });

          // 현재 항목 화살표 표시
          if (isCurrent) {
            slide.addText('\u25B6', {
              x: 11.8, y: y, w: 0.6, h: itemH - 0.1,
              fontSize: 14, color: theme.primary, align: 'center', valign: 'middle'
            });
          }
        });

      } else {
        // 기본 텍스트
        slide.addText(section.body || '', {
          x: 0.8, y: 1.3, w: 11.5, h: 5.5,
          fontSize: 16, fontFace: FONT,
          color: theme.text, valign: 'top',
          lineSpacing: 28
        });
      }

      // 스피커 노트
      if (section.notes) {
        slide.addNotes(section.notes);
      }

      slideNum++;

      // #5 페이지 번호 헬퍼
      addPageNumber(slide, slideNum, theme);
    }
  }

  // ========== 마무리 슬라이드 ==========
  if (slides.ending) {
    const endSlide = pptx.addSlide();

    // #6 그라데이션 배경
    applyGradientBg(endSlide, theme, pptx);

    // #4 중앙 체크마크 아이콘 도형
    endSlide.addShape(pptx.ShapeType.ellipse, {
      x: 5.66, y: 0.8, w: 2, h: 2,
      fill: { color: 'FFFFFF' }, transparency: 80
    });
    endSlide.addText('\u2714', {
      x: 5.66, y: 0.8, w: 2, h: 2,
      fontSize: 48, fontFace: FONT,
      color: 'FFFFFF', align: 'center', valign: 'middle'
    });

    endSlide.addText(slides.ending.title || '\uAC10\uC0AC\uD569\uB2C8\uB2E4', {
      x: 0.8, y: 3.0, w: 11.5, h: 1.5,
      fontSize: 44, fontFace: FONT,
      color: 'FFFFFF', bold: true, align: 'center'
    });

    // #4 감사합니다 아래 장식 라인
    endSlide.addShape(pptx.ShapeType.rect, {
      x: 5.16, y: 4.4, w: 3, h: 0.04, fill: { color: 'FFFFFF' }, transparency: 50
    });

    if (slides.ending.subtitle) {
      endSlide.addText(slides.ending.subtitle, {
        x: 0.8, y: 4.7, w: 11.5, h: 0.8,
        fontSize: 18, fontFace: FONT,
        color: 'FFFFFF', align: 'center', transparency: 30
      });
    }

    // 연락처 정보
    const contactParts = [];
    if (slides.ending.email) {
      contactParts.push('\u2709 ' + slides.ending.email);
    }
    if (slides.ending.phone) {
      contactParts.push('\u260E ' + slides.ending.phone);
    }
    if (slides.ending.website) {
      contactParts.push('\uD83C\uDF10 ' + slides.ending.website);
    }
    if (contactParts.length > 0) {
      endSlide.addText(contactParts.join('    |    '), {
        x: 0.8, y: 5.8, w: 11.5, h: 0.6,
        fontSize: 14, fontFace: FONT,
        color: 'FFFFFF', align: 'center', transparency: 40
      });
    }
  }

  const outputDir = path.join(__dirname, '..', 'output', 'pptx');
  fs.mkdirSync(outputDir, { recursive: true });
  const safeName = path.basename(filename);
  const outputPath = path.join(outputDir, safeName);
  await pptx.writeFile({ fileName: outputPath });
  return `output/pptx/${safeName}`;
}

// image-text placeholder 헬퍼
function _addImagePlaceholder(slide, pptx, x, y, w, h, theme) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: 'F1F5F9' },
    line: { color: theme.lightText, width: 1, dashType: 'dash' },
    rectRadius: 0.1
  });
  // 이미지 아이콘 표시
  slide.addShape(pptx.ShapeType.roundRect, {
    x: x + w / 2 - 0.5, y: y + h / 2 - 0.7, w: 1, h: 1,
    fill: { color: theme.lightText }, transparency: 70, rectRadius: 0.1
  });
  slide.addText('\uD83D\uDDBC', {
    x, y: y + h / 2 - 0.7, w, h: 1,
    fontSize: 36, align: 'center', valign: 'middle'
  });
  slide.addText('\uC774\uBBF8\uC9C0 \uC601\uC5ED', {
    x, y: y + h / 2 + 0.5, w, h: 0.5,
    fontSize: 14, fontFace: FONT,
    color: theme.lightText, align: 'center'
  });
}

module.exports = { generate, THEMES };
