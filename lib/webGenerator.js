const fs = require('fs');
const path = require('path');

function generateHTML(data, options = {}) {
  const {
    theme = 'modern',
    title = 'AI 교육',
    transition = 'slide'
  } = options;

  const themes = {
    modern: {
      primary: '#2563eb', secondary: '#1e40af', accent: '#3b82f6',
      bg: '#0f172a', slideBg: '#1e293b', text: '#f1f5f9',
      gradientFrom: '#2563eb', gradientTo: '#7c3aed'
    },
    light: {
      primary: '#2563eb', secondary: '#1e40af', accent: '#3b82f6',
      bg: '#f8fafc', slideBg: '#ffffff', text: '#1e293b',
      gradientFrom: '#2563eb', gradientTo: '#7c3aed'
    },
    corporate: {
      primary: '#0f766e', secondary: '#115e59', accent: '#14b8a6',
      bg: '#042f2e', slideBg: '#134e4a', text: '#f0fdfa',
      gradientFrom: '#0f766e', gradientTo: '#0284c7'
    },
    warm: {
      primary: '#ea580c', secondary: '#c2410c', accent: '#f97316',
      bg: '#1c1917', slideBg: '#292524', text: '#fafaf9',
      gradientFrom: '#ea580c', gradientTo: '#dc2626'
    }
  };

  const t = themes[theme] || themes.modern;
  const slidesHTML = generateSlidesHTML(data, t);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --primary: ${t.primary};
    --secondary: ${t.secondary};
    --accent: ${t.accent};
    --bg: ${t.bg};
    --slide-bg: ${t.slideBg};
    --text: ${t.text};
    --gradient-from: ${t.gradientFrom};
    --gradient-to: ${t.gradientTo};
  }

  body {
    font-family: 'Noto Sans KR', sans-serif;
    background: var(--bg);
    color: var(--text);
    overflow: hidden;
    height: 100vh;
  }

  .presentation {
    width: 100vw;
    height: 100vh;
    position: relative;
    overflow: hidden;
  }

  .slide {
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 60px 80px;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    background: var(--slide-bg);
  }

  .slide.active {
    opacity: 1;
    transform: translateX(0);
  }

  .slide.prev {
    opacity: 0;
    transform: translateX(-100%);
  }

  /* 표지 슬라이드 */
  .slide-cover {
    background: linear-gradient(135deg, var(--gradient-from), var(--gradient-to));
    justify-content: center;
    align-items: flex-start;
    padding: 80px 100px;
  }

  .slide-cover h1 {
    font-size: 5.5rem;
    font-weight: 900;
    line-height: 1.2;
    margin-bottom: 24px;
    opacity: 0;
    transform: translateY(30px);
    animation: fadeUp 0.8s ease forwards;
    animation-delay: 0.3s;
  }

  .slide-cover .subtitle {
    font-size: 1.8rem;
    opacity: 0;
    transform: translateY(20px);
    animation: fadeUp 0.8s ease forwards;
    animation-delay: 0.6s;
    color: rgba(255,255,255,0.8);
  }

  .slide-cover .presenter {
    font-size: 1.3rem;
    margin-top: 40px;
    opacity: 0;
    animation: fadeUp 0.8s ease forwards;
    animation-delay: 0.9s;
    color: rgba(255,255,255,0.6);
  }

  .slide-cover .accent-line {
    width: 80px;
    height: 4px;
    background: rgba(255,255,255,0.5);
    margin: 20px 0;
    opacity: 0;
    animation: lineGrow 0.6s ease forwards;
    animation-delay: 0.5s;
  }

  /* 섹션 구분 슬라이드 */
  .slide-section {
    background: linear-gradient(135deg, var(--secondary), var(--primary));
    align-items: flex-start;
    padding: 80px 100px;
  }

  .slide-section .section-num {
    font-size: 5rem;
    font-weight: 900;
    opacity: 0.15;
    position: absolute;
    top: 60px;
    right: 100px;
  }

  .slide-section h2 {
    font-size: 3.8rem;
    font-weight: 700;
  }

  .slide-section .section-desc {
    font-size: 1.5rem;
    margin-top: 20px;
    opacity: 0.7;
  }

  /* 내용 슬라이드 */
  .slide-content {
    padding: 50px 80px;
    justify-content: flex-start;
  }

  .slide-content .top-bar {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, var(--primary), var(--accent));
  }

  .slide-content h2 {
    font-size: 3rem;
    color: var(--primary);
    margin-bottom: 12px;
    font-weight: 700;
  }

  .slide-content .title-line {
    width: 60px;
    height: 3px;
    background: var(--accent);
    margin-bottom: 35px;
  }

  /* 불릿 포인트 */
  .bullet-list {
    list-style: none;
    padding: 0;
  }

  .bullet-list li {
    display: flex;
    align-items: flex-start;
    margin-bottom: 24px;
    font-size: 1.55rem;
    line-height: 1.6;
    opacity: 0;
    transform: translateX(-20px);
  }

  .slide.active .bullet-list li {
    animation: slideIn 0.5s ease forwards;
  }

  .bullet-list li:nth-child(1) { animation-delay: 0.2s; }
  .bullet-list li:nth-child(2) { animation-delay: 0.35s; }
  .bullet-list li:nth-child(3) { animation-delay: 0.5s; }
  .bullet-list li:nth-child(4) { animation-delay: 0.65s; }
  .bullet-list li:nth-child(5) { animation-delay: 0.8s; }
  .bullet-list li:nth-child(6) { animation-delay: 0.95s; }
  .bullet-list li:nth-child(7) { animation-delay: 1.1s; }
  .bullet-list li:nth-child(8) { animation-delay: 1.25s; }

  .bullet-dot {
    width: 12px;
    height: 12px;
    min-width: 12px;
    border-radius: 50%;
    background: var(--primary);
    margin-top: 10px;
    margin-right: 18px;
  }

  /* 카드 레이아웃 */
  .cards-container {
    display: flex;
    gap: 30px;
    flex: 1;
    align-items: stretch;
  }

  .card {
    flex: 1;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 35px;
    opacity: 0;
    transform: translateY(30px);
    position: relative;
    overflow: hidden;
  }

  .card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--primary), var(--accent));
  }

  .slide.active .card {
    animation: cardUp 0.6s ease forwards;
  }

  .slide.active .card:nth-child(1) { animation-delay: 0.2s; }
  .slide.active .card:nth-child(2) { animation-delay: 0.4s; }
  .slide.active .card:nth-child(3) { animation-delay: 0.6s; }
  .slide.active .card:nth-child(4) { animation-delay: 0.8s; }

  .card h3 {
    font-size: 1.55rem;
    color: var(--primary);
    margin-bottom: 18px;
    font-weight: 700;
  }

  .card p, .card li {
    font-size: 1.15rem;
    line-height: 1.7;
    opacity: 0.85;
  }

  .card ul {
    list-style: none;
    padding: 0;
  }

  .card ul li::before {
    content: '→ ';
    color: var(--accent);
    font-weight: bold;
  }

  /* 스텝 레이아웃 */
  .steps-container {
    display: flex;
    flex-direction: column;
    gap: 22px;
    flex: 1;
    justify-content: center;
  }

  .step {
    display: flex;
    align-items: center;
    gap: 20px;
    opacity: 0;
    transform: translateX(-30px);
  }

  .slide.active .step {
    animation: slideIn 0.5s ease forwards;
  }

  .slide.active .step:nth-child(1) { animation-delay: 0.2s; }
  .slide.active .step:nth-child(2) { animation-delay: 0.4s; }
  .slide.active .step:nth-child(3) { animation-delay: 0.6s; }
  .slide.active .step:nth-child(4) { animation-delay: 0.8s; }
  .slide.active .step:nth-child(5) { animation-delay: 1.0s; }

  .step-num {
    width: 48px;
    height: 48px;
    min-width: 48px;
    border-radius: 50%;
    background: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1.1rem;
    position: relative;
  }

  .step-connector {
    position: absolute;
    top: 48px;
    left: 50%;
    transform: translateX(-50%);
    width: 2px;
    height: 16px;
    background: var(--accent);
    opacity: 0.4;
  }

  .step-body h4 {
    font-size: 1.45rem;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .step-body p {
    font-size: 1.15rem;
    opacity: 0.7;
  }

  /* 2컬럼 */
  .two-col {
    display: flex;
    gap: 40px;
    flex: 1;
  }

  .two-col .col {
    flex: 1;
  }

  .two-col .col h3 {
    font-size: 1.6rem;
    color: var(--primary);
    margin-bottom: 15px;
    font-weight: 700;
  }

  .col-divider {
    width: 1px;
    background: rgba(255,255,255,0.1);
  }

  /* 숫자 강조 */
  .stat-grid {
    display: flex;
    gap: 30px;
    flex: 1;
    align-items: center;
    justify-content: center;
  }

  .stat-item {
    text-align: center;
    opacity: 0;
    transform: scale(0.8);
  }

  .slide.active .stat-item {
    animation: popIn 0.5s ease forwards;
  }

  .slide.active .stat-item:nth-child(1) { animation-delay: 0.2s; }
  .slide.active .stat-item:nth-child(2) { animation-delay: 0.4s; }
  .slide.active .stat-item:nth-child(3) { animation-delay: 0.6s; }
  .slide.active .stat-item:nth-child(4) { animation-delay: 0.8s; }

  .stat-number {
    font-size: 4.5rem;
    font-weight: 900;
    color: var(--primary);
    display: block;
  }

  .stat-label {
    font-size: 1.2rem;
    opacity: 0.7;
    margin-top: 5px;
  }

  /* 엔딩 슬라이드 */
  .slide-ending {
    background: linear-gradient(135deg, var(--gradient-from), var(--gradient-to));
    align-items: center;
    text-align: center;
  }

  .slide-ending h2 {
    font-size: 4rem;
    font-weight: 900;
    color: #fff;
  }

  .slide-ending .ending-sub {
    font-size: 1.6rem;
    margin-top: 15px;
    opacity: 0.7;
    color: #fff;
  }

  /* 네비게이션 */
  .nav-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 50px;
    background: rgba(0,0,0,0.3);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 30px;
    z-index: 100;
  }

  .nav-bar .progress-bar {
    position: absolute;
    top: 0;
    left: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--primary), var(--accent));
    transition: width 0.4s ease;
  }

  .nav-btn {
    background: none;
    border: none;
    color: rgba(255,255,255,0.7);
    font-size: 0.9rem;
    cursor: pointer;
    padding: 8px 16px;
    border-radius: 6px;
    transition: all 0.2s;
    font-family: 'Noto Sans KR', sans-serif;
  }

  .nav-btn:hover {
    background: rgba(255,255,255,0.1);
    color: #fff;
  }

  .slide-counter {
    font-size: 0.85rem;
    opacity: 0.6;
  }

  .fullscreen-btn {
    position: fixed;
    top: 15px;
    right: 15px;
    z-index: 101;
    background: rgba(0,0,0,0.3);
    border: none;
    color: rgba(255,255,255,0.6);
    width: 40px;
    height: 40px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1.2rem;
    transition: all 0.2s;
    backdrop-filter: blur(5px);
  }

  .fullscreen-btn:hover {
    background: rgba(0,0,0,0.5);
    color: #fff;
  }

  /* 애니메이션 */
  @keyframes fadeUp {
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideIn {
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes cardUp {
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes popIn {
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes lineGrow {
    from { opacity: 0; width: 0; }
    to { opacity: 1; width: 80px; }
  }

  @keyframes countUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
</head>
<body>
<div class="presentation" id="presentation">
${slidesHTML}
</div>

<div class="nav-bar">
  <div class="progress-bar" id="progressBar"></div>
  <button class="nav-btn" onclick="prevSlide()">← 이전</button>
  <span class="slide-counter" id="slideCounter">1 / 1</span>
  <button class="nav-btn" onclick="nextSlide()">다음 →</button>
</div>

<button class="fullscreen-btn" onclick="toggleFullscreen()" title="전체화면">⛶</button>

<script>
let current = 0;
const slides = document.querySelectorAll('.slide');
const total = slides.length;

function showSlide(index) {
  slides.forEach((s, i) => {
    s.classList.remove('active', 'prev');
    if (i === index) s.classList.add('active');
    else if (i < index) s.classList.add('prev');
  });
  current = index;
  document.getElementById('slideCounter').textContent = (current + 1) + ' / ' + total;
  document.getElementById('progressBar').style.width = ((current + 1) / total * 100) + '%';

  // 카운트업 애니메이션
  const activeSlide = slides[current];
  activeSlide.querySelectorAll('.count-up').forEach(el => {
    const target = parseInt(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    animateCount(el, 0, target, 1500, suffix);
  });
}

function animateCount(el, start, end, duration, suffix) {
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.floor(start + (end - start) * eased);
    el.textContent = value.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function nextSlide() {
  if (current < total - 1) showSlide(current + 1);
}

function prevSlide() {
  if (current > 0) showSlide(current - 1);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    nextSlide();
  }
  if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
    e.preventDefault();
    prevSlide();
  }
  if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  if (e.key === 'Home') showSlide(0);
  if (e.key === 'End') showSlide(total - 1);
});

// 터치 지원
let touchStartX = 0;
document.addEventListener('touchstart', e => touchStartX = e.touches[0].clientX);
document.addEventListener('touchend', e => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) {
    if (diff > 0) nextSlide();
    else prevSlide();
  }
});

showSlide(0);
</script>
</body>
</html>`;
}

function generateSlidesHTML(data, theme) {
  let html = '';

  // 표지
  if (data.cover) {
    html += `
  <div class="slide slide-cover">
    <h1>${escapeHtml(data.cover.title)}</h1>
    <div class="accent-line"></div>
    ${data.cover.subtitle ? `<div class="subtitle">${escapeHtml(data.cover.subtitle)}</div>` : ''}
    ${data.cover.presenter ? `<div class="presenter">${escapeHtml(data.cover.presenter)}</div>` : ''}
  </div>`;
  }

  // 목차
  if (data.toc && data.toc.length > 0) {
    html += `
  <div class="slide slide-content">
    <div class="top-bar"></div>
    <h2>목차</h2>
    <div class="title-line"></div>
    <div class="steps-container">
      ${data.toc.map((item, i) => `
      <div class="step">
        <div class="step-num">${i + 1}${i < data.toc.length - 1 ? '<div class="step-connector"></div>' : ''}</div>
        <div class="step-body"><h4>${escapeHtml(item)}</h4></div>
      </div>`).join('')}
    </div>
  </div>`;
  }

  // 내용 슬라이드
  if (data.content) {
    for (const section of data.content) {
      if (section.isSection) {
        html += `
  <div class="slide slide-section">
    <span class="section-num">${escapeHtml(section.sectionNumber || '')}</span>
    <h2>${escapeHtml(section.title)}</h2>
    ${section.description ? `<div class="section-desc">${escapeHtml(section.description)}</div>` : ''}
  </div>`;
        continue;
      }

      html += `
  <div class="slide slide-content">
    <div class="top-bar"></div>
    <h2>${escapeHtml(section.title)}</h2>
    <div class="title-line"></div>`;

      if (section.type === 'bullets') {
        html += `
    <ul class="bullet-list">
      ${(section.items || []).map(item => `
      <li><span class="bullet-dot"></span><span>${escapeHtml(item)}</span></li>`).join('')}
    </ul>`;
      } else if (section.type === 'cards') {
        html += `
    <div class="cards-container">
      ${(section.cards || []).map(card => `
      <div class="card">
        <h3>${escapeHtml(card.title)}</h3>
        ${card.items ? `<ul>${card.items.map(it => `<li>${escapeHtml(it)}</li>`).join('')}</ul>` : `<p>${escapeHtml(card.body || '')}</p>`}
      </div>`).join('')}
    </div>`;
      } else if (section.type === 'steps') {
        html += `
    <div class="steps-container">
      ${(section.steps || []).map((step, i) => `
      <div class="step">
        <div class="step-num">${i + 1}${i < section.steps.length - 1 ? '<div class="step-connector"></div>' : ''}</div>
        <div class="step-body">
          <h4>${escapeHtml(typeof step === 'string' ? step : step.title)}</h4>
          ${step.desc ? `<p>${escapeHtml(step.desc)}</p>` : ''}
        </div>
      </div>`).join('')}
    </div>`;
      } else if (section.type === 'two-column') {
        html += `
    <div class="two-col">
      <div class="col">
        <h3>${escapeHtml(section.leftTitle || '')}</h3>
        <ul class="bullet-list">
          ${(section.leftItems || []).map(item => `
          <li><span class="bullet-dot"></span><span>${escapeHtml(item)}</span></li>`).join('')}
        </ul>
      </div>
      <div class="col-divider"></div>
      <div class="col">
        <h3>${escapeHtml(section.rightTitle || '')}</h3>
        <ul class="bullet-list">
          ${(section.rightItems || []).map(item => `
          <li><span class="bullet-dot"></span><span>${escapeHtml(item)}</span></li>`).join('')}
        </ul>
      </div>
    </div>`;
      } else if (section.type === 'stats') {
        html += `
    <div class="stat-grid">
      ${(section.stats || []).map(stat => `
      <div class="stat-item">
        <span class="stat-number count-up" data-target="${stat.value}" data-suffix="${escapeHtml(stat.suffix || '')}">${stat.value}${escapeHtml(stat.suffix || '')}</span>
        <span class="stat-label">${escapeHtml(stat.label)}</span>
      </div>`).join('')}
    </div>`;
      } else {
        html += `<p style="font-size:1.4rem;line-height:1.8;opacity:0.9;">${escapeHtml(section.body || '')}</p>`;
      }

      html += `\n  </div>`;
    }
  }

  // 엔딩
  if (data.ending) {
    html += `
  <div class="slide slide-ending">
    <h2>${escapeHtml(data.ending.title || '감사합니다')}</h2>
    ${data.ending.subtitle ? `<div class="ending-sub">${escapeHtml(data.ending.subtitle)}</div>` : ''}
  </div>`;
  }

  return html;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { generateHTML };
